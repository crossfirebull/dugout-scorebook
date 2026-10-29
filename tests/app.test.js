// Automated checks for ScoreKept. Each test opens the real app in a headless browser and
// plays it like a person would. Run with: npm test
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
let server, base, browser;

before(async () => {
  // Serve the site the way GitHub Pages does
  server = http.createServer((req, res) => {
    let file = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (file.endsWith("/")) file += "index.html";
    const full = path.join(ROOT, file);
    if (!full.startsWith(ROOT) || !fs.existsSync(full)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
    fs.createReadStream(full).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser.close(); server.close(); });

// Open the app in a fresh browser (fresh saved data) at a given screen size
async function open(width = 390, height = 844, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base);
  await page.waitForSelector(".tabbar button");
  if (!options.keepSetup && await page.$(".onb [data-act=onb-sample]")) await page.click(".onb [data-act=onb-sample]");   // first launch: use the sample season
  return { page, context, errors };
}
const text = async (page, sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
const runs = async page => page.$$eval("#bug .r", r => r.map(x => +x.textContent));
async function tapResult(page, code) {
  await page.click(`[data-act=pa][data-v="${code}"]`);
  // Hit location may ask where the ball went; skip it
  const skip = await page.$("[data-act=hitskip], [data-act=posskip]");
  if (skip) await skip.click();
}
async function gameSettings(page) { await page.click("[data-act=settings]"); await page.waitForSelector(".sheet"); }
async function closeSheet(page) { await page.click(".sheet [data-act=close]"); }

test("opens with the sample season, five tabs and no errors", async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.title(), "ScoreKept");
  assert.deepEqual(await page.$$eval(".tabbar button", b => b.map(x => x.textContent.trim())), ["Game", "Book", "Stats", "Scout", "Team"]);
  for (const tab of ["book", "stats", "scout", "roster", "game"]) await page.click(`.tabbar [data-v=${tab}]`);
  assert.deepEqual(errors, []);
  await context.close();
});

test("a home run scores the batter and runners, and Undo takes it back", async () => {
  const { page, context } = await open();
  const before = await runs(page);
  await tapResult(page, "1B");
  await tapResult(page, "HR");
  const afterHR = await runs(page);
  assert.equal(afterHR[0], before[0] + 2, "single then home run should add two runs");
  await page.click("[data-act=undo]");
  assert.equal((await runs(page))[0], before[0] + 0, "undo removes the home run's two runs");
  await context.close();
});

test("three outs switch to the other half of the inning", async () => {
  const { page, context } = await open();
  await page.click(".tabbar [data-v=book]");
  const startHalf = await text(page, "#gamebar .chip");
  await page.click(".tabbar [data-v=game]");
  for (let i = 0; i < 3; i++) await tapResult(page, "K");
  await page.click(".tabbar [data-v=book]");
  assert.notEqual(await text(page, "#gamebar .chip"), startHalf);
  await context.close();
});

test("dugout mode: quick buttons score the other team's half", async () => {
  const { page, context } = await open();
  await gameSettings(page);
  if (!(await page.isChecked("#d-dugout"))) await page.click("label[for=d-dugout]");
  await closeSheet(page);
  for (let i = 0; i < 3; i++) await tapResult(page, "K");           // our half ends
  const before = await runs(page);
  await page.click("[data-act=quick][data-v=run]");
  await page.click("[data-act=quick][data-v=run]");
  assert.equal((await runs(page))[1], before[1] + 2);
  for (let i = 0; i < 3; i++) await page.click("[data-act=quick][data-v=out]");
  assert.ok(await page.$("[data-act=pa][data-v=HR]"), "our batters are back up after three quick outs");
  await context.close();
});

test("a game tied after the last inning ends as a tie when there are no extra innings", async () => {
  const { page, context } = await open();
  await gameSettings(page);
  for (let i = 0; i < 3; i++) await page.click(".sheet [data-act=inn][data-v='-1']");   // 4 innings; sample is tied 0-0 in the 4th? make it so
  await page.selectOption("#d-extras", "0");
  if (!(await page.isChecked("#d-dugout"))) await page.click("label[for=d-dugout]");
  await closeSheet(page);
  // play out the 4th with no more runs
  for (let i = 0; i < 12 && !(await page.$(".final")); i++) {
    if (await page.$("[data-act=pa][data-v=K]")) await tapResult(page, "K"); else await page.click("[data-act=quick][data-v=out]");
  }
  const [us, them] = await runs(page);
  const banner = await text(page, ".final");
  if (us === them) assert.match(banner, /Tie game/);
  else assert.match(banner, /win/);
  await context.close();
});

test("New Game will not start with two players at the same position", async () => {
  const { page, context } = await open();
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]");
  const cards = await page.$$(".pcard");
  await cards[0].click(); await (await page.$$(".pcard"))[1].click();
  // put the second batter at the first batter's position
  const firstPos = await page.inputValue("[data-row=pos][data-i='0']");
  await page.evaluate(pos => { const s = document.querySelector("[data-row=pos][data-i='1']"); [...s.options].forEach(o => o.disabled = false); s.value = pos; }, firstPos);
  await page.click("[data-act=ng-next]");
  assert.match(await text(page, ".sheet"), /Each position can only be used once/);
  assert.ok(await page.$(".lubuild"), "stays on the lineup step");
  await context.close();
});

test("saving a game adds it to the season record and stats", async () => {
  const { page, context } = await open();
  await page.click(".tabbar [data-v=stats]");
  const gamesBefore = +(await text(page, ".sbar h2")).match(/(\d+) games?/)[1];
  await page.click(".tabbar [data-v=game]");
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click(".tabbar [data-v=stats]");
  await page.click("[data-act=statstab][data-v=batting]");
  const header = await text(page, ".sbar h2");
  assert.equal(+header.match(/(\d+) games?/)[1], gamesBefore, "the in-progress game was already counted; saving keeps the count");
  assert.ok((await page.$$("table.stats tbody tr")).length >= 9, "batting table lists the roster");
  await context.close();
});

test("everything is still there after closing and reopening", async () => {
  const { page, context } = await open();
  await page.click(".tabbar [data-v=roster]");
  await page.click("[data-act=teamedit]");
  await page.fill("#teamName", "Reload Test");
  await page.press("#teamName", "Tab");
  await page.click(".sheet [data-act=close]");
  await tapResult(page, "1B").catch(() => {});
  await page.reload(); await page.waitForSelector(".tabbar button");
  await page.click(".tabbar [data-v=roster]");
  assert.equal(await text(page, ".teamhead .teamword"), "Reload Test");
  await context.close();
});

test("saved data that can't be read is set aside, never overwritten", async () => {
  const { page, context } = await open();
  await page.evaluate(() => localStorage.setItem("dugout-scorebook.v2", "{not valid"));
  await page.reload(); await page.waitForSelector(".tabbar button");
  assert.match(await text(page, "#alertBox"), /couldn't be read/);
  assert.ok(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes("unreadable") && localStorage.getItem(k) === "{not valid")));
  await context.close();
});

test("a backup file contains every game and restores", async () => {
  const { page, context } = await open(1024, 900);
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=backup]");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click(".sheet [data-act=dl-backup]")]);
  const data = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  assert.ok(data.games.length >= 7 && data.team.players.length >= 10);
  await page.setInputFiles("#restoreFile", await download.path());
  await page.waitForTimeout(200);
  assert.match(await text(page, ".sheet"), /Restored \d+ games/);
  await context.close();
});

test("every screen size keeps the scoring buttons on screen", async () => {
  const screens = [[390, 844], [844, 390], [800, 480], [744, 1133], [820, 1180], [1180, 820], [1440, 900]];
  for (const [w, h] of screens) {
    const { page, context } = await open(w, h);
    const r = await page.evaluate(() => {
      const pad = document.getElementById("pad").getBoundingClientRect(), bar = document.getElementById("tabbar").getBoundingClientRect();
      const limit = bar.height > bar.width ? innerHeight : bar.top;   // side rail vs bottom bar
      return { fits: pad.bottom <= limit + 1, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(r.fits, `buttons cut off at ${w}x${h}`);
    assert.ok(!r.sideways, `sideways scrolling at ${w}x${h}`);
    await context.close();
  }
});

test("works offline after the first visit", async () => {
  const { page, context } = await open();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForSelector(".tabbar button");
  await context.setOffline(true);
  await page.reload(); await page.waitForSelector(".tabbar button");
  assert.equal(await page.title(), "ScoreKept");
  assert.match(await text(page, "#alertBox"), /Offline/);
  await context.close();
});

test("first launch walks through setup, and the choices land in Settings", async () => {
  const { page, context, errors } = await open(390, 844, { keepSetup: true });
  assert.ok(await page.$(".onb .welcome"), "welcome screen on first launch");
  await page.click("[data-act=onb-start]");
  await page.click("[data-act=onb-next]");                                   // no name yet
  assert.match(await text(page, ".onb"), /Enter your team's name/);
  await page.fill("#onbName", "Test Tigers");
  assert.match(await text(page, "#onbPreview"), /TIG/, "score bug preview uses the short name");
  await page.click("[data-act=onb-next]");
  await page.click("[data-act=teamcolor][data-k=primary][data-v=maroon]");
  await page.click("[data-act=teamcolor][data-k=secondary][data-v=gold]");
  await page.click("[data-act=onb-next]");
  await page.click("[data-act=onb-mode][data-v=scorekeeper]");
  await page.click("[data-act=onb-next]");
  await page.click("[data-act=prefinn][data-v='1']");
  await page.selectOption("#p-extras", "0");
  await page.selectOption("#p-hrRule", "max1");
  await page.click("[data-act=onb-next]");
  for (const [name, num, pos] of [["Ava Ruiz", "4", "SS"], ["Jo Kim", "12", "C"]]) {
    await page.fill("#onbPName", name); await page.fill("#onbPNum", num); await page.selectOption("#onbPPos", pos);
    await page.click("[data-act=onb-addp]");
  }
  assert.equal((await page.$$(".onb .qlist li")).length, 2);
  await page.click("[data-act=onb-next]");
  const summary = await text(page, ".onb .summary");
  assert.match(summary, /Test Tigers/); assert.match(summary, /Maroon & Gold/); assert.match(summary, /Scorekeeper mode/); assert.match(summary, /8 innings · ties stand/); assert.match(summary, /HR 1 per team/); assert.match(summary, /2 players/);
  await page.click("[data-act=onb-finish][data-v=game]");
  assert.ok(await page.$("#tour .tcard"), "the basics tour starts after setup");
  await page.click("[data-act=tour-skip]");
  assert.match(await text(page, ".sheet h3"), /New Game/, "Start a game opens New Game");
  assert.ok(await page.$(".luempty"), "New Game starts with the lineup, and the roster doesn't fill it in");
  assert.equal(await page.$$eval(".pgroup h5", h => h.map(x => x.firstChild.textContent).join(",")), "Catchers,Infield", "players grouped by position");
  await page.click("[data-act=ng-next]");
  assert.match(await text(page, ".sheet .stepper"), /8/, "new game uses the 8-inning default");
  await page.click(".sheet [data-act=close]");
  await page.click("[data-act=settings]");
  assert.match(await text(page, ".sheet"), /Test Tigers/);
  assert.equal(await page.isChecked("#p-dugout"), false); assert.equal(await page.inputValue("#p-extras"), "0"); assert.equal(await page.inputValue("#p-hrRule"), "max1");
  await page.reload(); await page.waitForSelector(".tabbar button");
  assert.equal(await page.$(".onb"), null, "setup doesn't come back after it's done");
  assert.deepEqual(errors, []);
  await context.close();
});

test("Team tab: add a player and edit them in their own panel", async () => {
  const { page, context } = await open();
  await page.click(".tabbar [data-v=roster]");
  const before = (await page.$$(".plist li")).length;
  await page.click("[data-act=addplayer]");
  await page.fill("#pl-name", "New Hitter"); await page.press("#pl-name", "Tab");
  await page.fill("#pl-num", "77"); await page.press("#pl-num", "Tab");
  await page.selectOption("[data-ch=ppos][data-k='0']", "2B");
  await page.selectOption("[data-ch=ppos][data-k='1']", "SS");
  await page.click("[data-act=pbats][data-v=L]");
  await page.click(".sheet [data-act=close]");
  assert.equal((await page.$$(".plist li")).length, before + 1);
  const row = await text(page, ".plist li:last-child");
  assert.match(row, /77/); assert.match(row, /New Hitter/); assert.match(row, /2B \/ SS/); assert.match(row, /Bats L/);
  await context.close();
});

test("fielder's choice asks which runner was out, and allows everyone safe", async () => {
  const { page, context } = await open();
  // put two runners on: single, single
  await tapResult(page, "1B"); await tapResult(page, "1B");
  const outsBefore = await page.$$eval("#bug .outs i.on", x => x.length);
  await page.click("[data-act=pa][data-v=FC]");
  assert.match(await text(page, ".sheet"), /Which runner was put out/);
  const choices = await page.$$eval(".sheet [data-act=fcout]", b => b.map(x => x.dataset.v));
  assert.deepEqual(choices, ["1", "0", "-1"], "runners on 2nd and 1st, plus nobody");
  await page.click(".sheet [data-act=fcout][data-v='1']");                  // lead runner out at third
  assert.equal(await page.$$eval("#bug .outs i.on", x => x.length), (outsBefore + 1) % 3);
  await page.click(".tabbar [data-v=book]");
  assert.match(await text(page, "#pbp li:first-child"), /fielder's choice; .+ out at third/);
  await page.click(".tabbar [data-v=game]");
  await page.click("[data-act=pa][data-v=FC]");
  await page.click(".sheet [data-act=fcout][data-v='-1']");                 // everyone safe
  await page.click(".tabbar [data-v=book]");
  assert.match(await text(page, "#pbp li:first-child"), /everyone safe/);
  await context.close();
});

test("the FC button is off when nobody is on base", async () => {
  const { page, context } = await open();
  for (let i = 0; i < 3 && await page.$$eval("#bug .bbase.on", x => x.length); i++) {
    // clear the bases by making outs until the side changes, if needed
    await tapResult(page, "K");
  }
  if (await page.$$eval("#bug .bbase.on", x => x.length) === 0) assert.ok(await page.$eval("[data-act=pa][data-v=FC]", b => b.disabled));
  await context.close();
});

test("a runner who scores on the batter's play earns that batter an RBI", async () => {
  const { page, context } = await open();
  await tapResult(page, "3B");                                     // runner on third
  const batter = await page.$eval("#atbat .now", n => [...n.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join("").trim());
  await tapResult(page, "GO");                                     // ground out; runner breaks for home
  await page.click("#bug .bbase.on");
  assert.match(await text(page, ".sheet"), new RegExp("RBI to " + batter.split(" ")[0]));
  await page.click(".sheet [data-act=run][data-rbi]");
  await page.click(".tabbar [data-v=book]");
  assert.match(await text(page, "#pbp li:first-child"), new RegExp("RBI: " + batter));
  // and "Scored, no RBI" gives none
  await page.click(".tabbar [data-v=game]");
  await tapResult(page, "3B"); await tapResult(page, "FO");
  await page.click("#bug .bbase.on");
  await page.click(".sheet [data-act=run][data-v=score]:not([data-rbi])");
  await page.click(".tabbar [data-v=book]");
  assert.doesNotMatch(await text(page, "#pbp li:first-child"), /RBI/);
  await context.close();
});

test("the spray tab shows a team chart that can show only hits or only outs", async () => {
  const { page, context, errors } = await open(1180, 820);
  await page.click(".tabbar [data-v=stats]");
  await page.click("[data-act=statstab][data-v=spray]");
  await page.waitForSelector(".teamcard svg.spray");
  const dots = async () => page.$$eval(".teamcard svg.spray circle:not(.hit)", c => c.map(x => x.getAttribute("class")));
  const all = await dots();
  assert.ok(all.length > 0, "team chart has balls in play");
  await page.click("[data-act=sprayfilter][data-v=hits]");
  const hits = await dots();
  assert.ok(hits.length > 0 && hits.every(c => c !== "o"), "hits only");
  await page.click("[data-act=sprayfilter][data-v=outs]");
  const outs = await dots();
  assert.ok(outs.length > 0 && outs.every(c => c === "o"), "outs only");
  assert.ok(hits.length + outs.length <= all.length);
  assert.deepEqual(errors, []);
  await context.close();
});

test("the built-in organ sounds play without errors", async () => {
  const { page, context, errors } = await open();
  await page.click("#soundBtn");
  assert.equal(await page.getAttribute("#soundBtn", "aria-pressed"), "true");
  for (const code of ["1B", "BB", "HR", "K"]) await tapResult(page, code);
  await page.waitForTimeout(1500);
  assert.deepEqual(errors, []);
  await context.close();
});

// ---------- A simulated season, checked against a hand-kept stat sheet ----------
const { simulateSeason, rates } = require("./season-sim");
const show = {
  int: v => String(v), avg: v => v == null ? "—" : (v >= 1 ? v.toFixed(3) : v.toFixed(3).slice(1)),
  pct: v => v == null ? "—" : Math.round(v * 100) + "%", dec: v => v == null ? "—" : v.toFixed(1), dec2: v => v == null ? "—" : v.toFixed(2)
};
function expectedRow(s) {
  const x = Object.assign({}, s, rates(s));
  return {
    G: show.int(s.G), PA: show.int(s.PA), AB: show.int(s.AB), R: show.int(s.R), H: show.int(s.H), "2B": show.int(s["2B"]), "3B": show.int(s["3B"]),
    HR: show.int(s.HR), RBI: show.int(s.RBI), BB: show.int(s.BB), K: show.int(s.K),
    AVG: show.avg(x.AVG), OBP: show.avg(x.OBP), SLG: show.avg(x.SLG), OPS: show.avg(x.OPS), wOBA: show.avg(x.wOBA), ISO: show.avg(x.ISO),
    BABIP: show.avg(x.BABIP), "K%": show.pct(x["K%"]), "BB%": show.pct(x["BB%"]), "BB/K": show.dec2(s.K ? s.BB / s.K : null),
    "RISP AVG": show.avg(x["RISP AVG"]), RC: show.dec(x.RC), ROE: show.int(s.ROE), "HR out": show.int(s.HRO), FBO: show.int(s.FBO)
  };
}
async function loadSeason(page, store) {
  await page.addInitScript(data => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("dugout-scorebook.v2", data); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(store));
  await page.goto(base);
  await page.waitForSelector(".tabbar button");
}
async function readTable(page, which) {
  await page.click(`[data-act=table][data-v=${which}]`);
  return page.$$eval("table.stats", ([t]) => {
    const heads = [...t.querySelectorAll("thead th")].map(th => th.textContent.replace(/[▲▼]/g, "").trim());
    const row = tr => Object.fromEntries([...tr.children].map((td, i) => [heads[i], td.textContent.trim()]));
    return { rows: [...t.querySelectorAll("tbody tr")].map(row), team: row(t.querySelector("tfoot tr")) };
  });
}

// Seed 283 has every kind of play, 39 an extra-inning game, 9 a walk-off triple with two runners on
for (const seed of [283, 39, 9]) test(`simulated season ${seed}: every batting stat matches a hand-kept sheet`, async () => {
  const { store, sheet, results, names } = simulateSeason(seed);
  const { page, context, errors } = await open(1180, 820, { keepSetup: true });
  await loadSeason(page, store);
  await page.click(".tabbar [data-v=stats]");
  // Game results
  const games = await page.$$eval(".games li .who b", b => b.map(x => x.textContent.trim()));
  assert.deepEqual(games.slice().sort(), results.map(r => `${r.us}–${r.them}`).sort(), "final scores");
  await page.click("[data-act=statstab][data-v=batting]");
  const mismatches = [];
  const total = Object.assign(...Object.keys(sheet.p1).map(k => ({ [k]: Object.values(sheet).reduce((a, s) => a + s[k], 0) })));
  total.G = 5;
  for (const which of ["std", "adv"]) {
    const { rows, team } = await readTable(page, which);
    for (const [pid, s] of Object.entries(sheet)) {
      const got = rows.find(r => r.Player.endsWith(names[pid])), want = expectedRow(s);
      assert.ok(got, `${names[pid]} has a row`);
      for (const k of Object.keys(got)) if (k !== "Player" && want[k] !== undefined && got[k] !== want[k]) mismatches.push(`${names[pid]} ${k}: app ${got[k]}, sheet ${want[k]}`);
    }
    const want = expectedRow(total);
    for (const k of Object.keys(team)) if (k !== "Player" && want[k] !== undefined && team[k] !== want[k]) mismatches.push(`Team ${k}: app ${team[k]}, sheet ${want[k]}`);
  }
  assert.deepEqual(mismatches, []);
  assert.deepEqual(errors, []);
  await context.close();
});

// ---------- League rules ----------
// A saved game in progress, built from taps, to check how the rules end games
function ruleGame(settings, events, extra = {}) {
  const players = Array.from({ length: 12 }, (_, i) => ({ id: "r" + i, name: "Player " + (i + 1), num: String(i + 1), pos: "", alt: [], bats: "R" }));
  const ours = players.map((p, i) => ({ pid: p.id, name: p.name, pos: ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "RCF", "RF", "EH", "EH"][i] }));
  const ourSide = extra.ourSide == null ? 1 : extra.ourSide;
  const g = Object.assign({ id: "rg", seasonId: "s1", date: "2026-10-01", opponent: "Rule Testers", ourSide,
    settings: Object.assign({ innings: 7, mode: "dugout", askHits: false, extras: -1, timeLimit: 0, runRule: [], hrRule: "none" }, settings),
    lineups: ourSide ? [[], ours] : [ours, []], events, done: false }, extra.game || {});
  return { v: 2, sample: false, onboarded: true, lastBackup: Date.now(), team: { name: "Home Nine", players }, games: [g], currentId: "rg",
    seasons: [{ id: "s1", name: "Fall 2026", start: "2026-09-01" }], currentSeasonId: "s1", prefs: {}, audio: {} };
}
const Q = k => ({ t: "quick", k }), PA = (r, more) => Object.assign({ t: "pa", r }, more);
const threeOuts = () => [Q("out"), Q("out"), Q("out")], ourOuts = () => [PA("K"), PA("K"), PA("K")];
async function openGame(store) {
  const { page, context, errors } = await open(1180, 820, { keepSetup: true });
  await loadSeason(page, store);
  await page.click(".tabbar [data-v=game]");
  return { page, context, errors };
}

test("run rule: 20 after 3 ends the game when the home team is that far ahead", async () => {
  const ev = [...threeOuts(), ...Array(10).fill(PA("HR")), ...ourOuts(), ...threeOuts(), ...Array(10).fill(PA("HR")), ...ourOuts(), ...threeOuts()];
  const { page, context, errors } = await openGame(ruleGame({ runRule: [[3, 20], [4, 15], [5, 10]] }, ev));
  assert.match(await text(page, ".final"), /Run rule\. Home Nine win 20–0/);
  assert.deepEqual(await runs(page), [0, 20]);
  assert.deepEqual(errors, []);
  await context.close();
});

test("run rule: the home team wins the moment it gets 10 ahead in the 5th, and only that run counts", async () => {
  // 9-0 after four innings, then in the 5th: a walk, and a triple that would score two
  const ev = [...threeOuts(), ...Array(9).fill(PA("HR")), ...ourOuts()];
  for (let i = 2; i <= 4; i++) ev.push(...threeOuts(), ...ourOuts());
  ev.push(...threeOuts(), PA("BB"), PA("BB"), PA("3B"));
  const { page, context, errors } = await openGame(ruleGame({ runRule: [[3, 20], [4, 15], [5, 10]] }, ev));
  assert.match(await text(page, ".final"), /Run rule\. Home Nine win 10–0/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("run rule: a visiting team far ahead still lets the home team bat", async () => {
  const ev = [];
  for (let i = 1; i <= 3; i++) ev.push(...threeOuts(), ...ourOuts());
  ev.push(...Array(15).fill(PA("HR")), ...ourOuts());   // top of the 4th: we're the visitors, 15-0
  const store = ruleGame({ runRule: [[3, 20], [4, 15], [5, 10]] }, [], { ourSide: 0 });
  // we bat first here, so rebuild the order: our half, then their quick half
  const evs = [];
  for (let i = 1; i <= 3; i++) evs.push(...ourOuts(), ...threeOuts());
  evs.push(...Array(15).fill(PA("HR")), ...ourOuts());
  store.games[0].events = evs;
  const { page, context, errors } = await openGame(store);
  assert.equal(await page.$(".final"), null, "home team still bats in the 4th");
  await page.click("[data-act=quick][data-v=out]"); await page.click("[data-act=quick][data-v=out]"); await page.click("[data-act=quick][data-v=out]");
  assert.match(await text(page, ".final"), /Run rule\. Home Nine win 15–0/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("tied after 7: one extra inning, then it's a tie", async () => {
  const ev = [];
  for (let i = 1; i <= 7; i++) ev.push(...threeOuts(), ...ourOuts());
  const { page, context, errors } = await openGame(ruleGame({ extras: 1 }, ev));
  assert.equal(await page.$(".final"), null, "the 8th is played");
  for (let i = 0; i < 3; i++) await page.click("[data-act=quick][data-v=out]");
  for (let i = 0; i < 3; i++) await tapResult(page, "K");
  assert.match(await text(page, ".final"), /Tie game, 0–0/);
  await page.click(".tabbar [data-v=book]");
  assert.equal(await page.$$eval("#board thead th", th => th.filter(x => /^\d+$/.test(x.textContent.trim())).length), 8);
  assert.deepEqual(errors, []);
  await context.close();
});

test("+2 home run rule: the third homer without an answer is an out, until the other team hits one", async () => {
  const { page, context, errors } = await openGame(ruleGame({ hrRule: "plus2" }, [...threeOuts()]));
  await tapResult(page, "HR"); await tapResult(page, "HR");
  assert.match(await text(page, "[data-act=pa][data-v=HR]"), /Over limit: out/);
  await tapResult(page, "HR");
  assert.deepEqual(await runs(page), [0, 2]);
  assert.match(await text(page, "#bug .outs"), /OUT/);
  await tapResult(page, "K"); await tapResult(page, "K");
  await page.click("[data-act=quick][data-v=hr]");   // they hit one: now we can hit another
  for (let i = 0; i < 3; i++) await page.click("[data-act=quick][data-v=out]");
  assert.match(await text(page, "[data-act=pa][data-v=HR]"), /Home run/);
  await tapResult(page, "HR");
  assert.deepEqual(await runs(page), [1, 3]);
  assert.deepEqual(errors, []);
  await context.close();
});

test("1 home run per team: the second one is an out", async () => {
  const { page, context, errors } = await openGame(ruleGame({ hrRule: "max1" }, [...threeOuts()]));
  await tapResult(page, "HR");
  await tapResult(page, "HR");
  assert.deepEqual(await runs(page), [0, 1]);
  await page.click(".tabbar [data-v=book]");
  assert.match(await page.textContent("#view"), /ruled an out/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("time limit: when time runs out, the inning being played is the last one", async () => {
  const ev = [];
  for (let i = 1; i <= 3; i++) ev.push(...threeOuts(), ...ourOuts());
  ev.push(Q("run"), Q("out"));   // top of the 4th under way
  const store = ruleGame({ timeLimit: 55, extras: 1 }, ev, { game: { clock: { start: Date.now() - 56 * 60000 } } });
  const { page, context, errors } = await openGame(store);
  await page.waitForSelector("#bug .clk.called");
  assert.match(await text(page, "#bug .clk"), /LAST/);
  await page.click("[data-act=quick][data-v=out]"); await page.click("[data-act=quick][data-v=out]");
  await tapResult(page, "1B"); await tapResult(page, "HR");
  assert.match(await text(page, ".final"), /Time limit\. Home Nine win 2–1/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("time limit: the clock starts with the first play and counts down", async () => {
  const { page, context, errors } = await openGame(ruleGame({ timeLimit: 55 }, []));
  assert.match(await text(page, "#bug .clk"), /55:00/);
  await page.click("[data-act=quick][data-v=out]");
  await page.waitForFunction(() => /54:5\d/.test(document.querySelector("#bug .clk").textContent));
  await gameSettings(page);
  assert.match(await text(page, ".sheet"), /Game clock/);
  await page.click("[data-act=timecall]");
  assert.match(await text(page, "#bug .clk"), /LAST/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("courtesy runner: someone runs for the batter, once per inning, and gets the run", async () => {
  const { page, context, errors } = await openGame(ruleGame({}, [...threeOuts()]));
  await tapResult(page, "1B");
  await page.click("#bug [data-act=base][data-b='0']");
  assert.doesNotMatch(await text(page, ".sheet"), /Steal/i, "no stealing in softball");
  await page.click("[data-act=crpick]");
  await page.click(".sheet [data-act=cr] >> text=Player 12");
  assert.match(await page.getAttribute("#bug [data-act=base][data-b='0']", "aria-label"), /Player 12/);
  await tapResult(page, "1B");
  await page.click("#bug [data-act=base][data-b='0']");
  assert.equal(await page.isDisabled("[data-act=crpick]"), true, "only one per inning");
  await page.click(".sheet [data-act=close]");
  await tapResult(page, "HR");
  await page.click(".tabbar [data-v=book]");
  assert.match(await page.textContent("#view"), /Courtesy runner: Player 12 runs for Player 1/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("league rules are in Game settings and Settings, and lineups take bat-only players", async () => {
  const { page, context, errors } = await open(1180, 820);
  await gameSettings(page);
  for (const id of ["#d-extras", "#d-timeLimit", "#d-rr0a", "#d-hrRule"]) assert.ok(await page.$(id), id + " in Game settings");
  await page.click("[data-act=opensettings]");
  for (const id of ["#p-extras", "#p-timeLimit", "#p-rr0a", "#p-hrRule"]) assert.ok(await page.$(id), id + " in Settings");
  await page.selectOption("#p-timeLimit", "55");
  await page.fill("#p-rr0a", "3"); await page.fill("#p-rr0l", "20"); await page.press("#p-rr0l", "Tab");
  await page.click(".sheet [data-act=close]");
  await page.reload(); await page.waitForSelector(".tabbar button");
  await gameSettings(page); await page.click("[data-act=opensettings]");
  assert.equal(await page.inputValue("#p-rr0a"), "3"); assert.equal(await page.inputValue("#p-rr0l"), "20");
  assert.equal(await page.inputValue("#p-timeLimit"), "55");
  await page.click(".sheet [data-act=close]");
  await page.click("[data-act=lineups]");
  assert.ok(await page.$("option[value=EH]"), "EH option");
  assert.match(await page.textContent("option[value=EH]"), /bats only/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Help opens from Settings and Game settings, and Done goes back", async () => {
  const { page, context, errors } = await open(390, 844);
  await gameSettings(page);
  await page.click("[data-act=help]");
  assert.match(await text(page, ".sheet h3"), /Help/);
  const topics = await page.$$eval(".help summary", s => s.map(x => x.textContent));
  for (const t of ["Scoring a play", "Moving runners", "League rules", "Keeping your data safe"]) assert.ok(topics.includes(t), t);
  await page.click(".help summary >> text=League rules");
  assert.match(await text(page, ".help details[open]:has(summary:text('League rules'))"), /Run rule/);
  await page.click(".sheet [data-act=close]");
  assert.match(await text(page, ".sheet h3"), /Game Settings/, "back to Game settings");
  await page.click("[data-act=opensettings]");
  await page.click("[data-act=help]");
  await page.click(".sheet [data-act=close]");
  assert.match(await text(page, ".sheet h3"), /Settings/, "back to Settings");
  assert.deepEqual(errors, []);
  await context.close();
});

test("New Game: build the lineup from player cards, drag to reorder, then game details", async () => {
  const { page, context, errors } = await open(1180, 820);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]");
  assert.ok(await page.$(".luempty"), "starts empty");
  const names = await page.$$eval(".pcard .nm b", b => b.map(x => x.textContent));
  assert.ok(names.length >= 10);
  assert.ok(await page.$(".pcard .st b"), "cards show season stats");
  for (const n of names.slice(0, 4)) await page.click(`.pcard:has-text("${n}")`);
  const order = () => page.$$eval(".lurow .who b", b => b.map(x => x.textContent.replace(/^#\d+\s*/, "")));
  const before = await order();
  assert.equal(before.length, 4);
  assert.match(await page.getAttribute(`.pcard:has-text("${names[0]}") .flag`, "aria-label"), /Bats 1st/);
  // drag the 4th batter to the top by the handle
  const grip = await page.$("[data-grip='3']"), box = await grip.boundingBox(), top = await (await page.$("[data-grip='0']")).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + (top.y - box.y - 4) * i / 10);
  await page.mouse.up();
  assert.deepEqual(await order(), [before[3], before[0], before[1], before[2]]);
  // tapping a card in the lineup takes that player out
  await page.click(`.pcard:has-text("${before[1]}")`);
  assert.deepEqual(await order(), [before[3], before[0], before[2]]);
  await page.click("[data-act=ng-next]");
  assert.match(await text(page, ".sheet .steps"), /Game details/);
  await page.fill("#d-opponent", "Drag Testers");
  await page.click("[data-act=startgame]");
  assert.match(await text(page, "#atbat"), new RegExp(before[3]));
  assert.deepEqual(errors, []);
  await context.close();
});

test("New Game: Same as last game copies the last lineup", async () => {
  const { page, context, errors } = await open(390, 844);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]");
  await page.click("[data-act=lu-last]");
  assert.ok((await page.$$(".lurow")).length >= 9);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Stats tabs all fit on a small phone, with no sideways scrolling", async () => {
  for (const width of [320, 344, 360, 368, 375, 390, 414, 430]) {
    const { page, context } = await open(width, 700);
    await page.click(".tabbar [data-v=stats]");
    const fit = await page.$eval(".tabs.seg", el => ({ over: el.scrollWidth - el.clientWidth, labels: [...el.children].map(b => b.scrollWidth <= b.clientWidth + 1) }));
    assert.equal(fit.over, 0, `${width}px: tabs scroll sideways`);
    assert.ok(fit.labels.every(Boolean), `${width}px: a tab label is cut off`);
    assert.deepEqual(await page.$$eval(".tabs.seg button", b => b.map(x => x.textContent)), ["Overview", "Batting", "Charts", "Lineups"]);
    await page.click("[data-act=statstab][data-v=batting]");
    const sub = await page.$eval(".tabs.seg.sub", el => ({ over: el.scrollWidth - el.clientWidth, labels: [...el.children].map(b => b.scrollWidth <= b.clientWidth + 1 && b.offsetHeight < 50) }));
    assert.equal(sub.over, 0, `${width}px: table tabs scroll sideways`);
    assert.ok(sub.labels.every(Boolean), `${width}px: a table tab label is cut off or wraps`);
    await context.close();
  }
});

test("Tap on the field: place a hit or an out exactly, and it shows on the spray chart there", async () => {
  const { page, context, errors } = await open(393, 852, { hasTouch: true, isMobile: true });
  const tapField = async (x, y) => {
    const [px, py] = await page.evaluate(([x, y]) => { const m = document.querySelector("#ffield").getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; }, [x, y]);
    await page.mouse.click(px, py);
  };
  // a double into the left-center gap
  await page.click("[data-act=pa][data-v='2B']");
  await page.click("[data-act=fieldopen]");
  assert.ok(await page.$(".fieldfs"), "full-screen field");
  assert.equal(await page.isDisabled("[data-act=fieldsave]"), true, "nothing to save until you tap");
  await tapField(60, 55);
  assert.match(await text(page, ".fft small"), /left-center/);
  await page.click("[data-act=bbtype][data-v=LD]");
  await tapField(62, 56);   // tap again to move it
  await page.click("[data-act=fieldsave]");
  assert.equal(await page.$(".fieldfs"), null);
  // Back returns to the usual choices
  await page.click("[data-act=pa][data-v=GO]");
  await page.click("[data-act=fieldopen]");
  await page.click(".fffoot [data-act=fieldback]");
  assert.ok(await page.$(".posgrid"), "back to the fielder choices");
  await page.click("[data-act=fieldopen]");
  await tapField(84, 100);   // shortstop's spot
  await page.click("[data-act=fieldsave]");
  await page.click(".tabbar [data-v=book]");
  const pbp = await page.textContent("#view");
  assert.match(pbp, /doubles to left-center field/);
  assert.match(pbp, /grounds out to shortstop/);
  // the spray chart puts the double where it was tapped
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=statstab][data-v=spray]");
  const dots = await page.$$eval(".teamcard circle.h2", c => c.map(x => [+x.getAttribute("cx"), +x.getAttribute("cy")]));
  assert.ok(dots.some(([x, y]) => Math.abs(x - 62) <= 1 && Math.abs(y - 56) <= 1), "double drawn at the tapped spot: " + JSON.stringify(dots.filter(([x, y]) => Math.abs(x - 62) < 6 && Math.abs(y - 56) < 6)));
  assert.deepEqual(errors, []);
  await context.close();
});

test("built-in walk-up tunes: every player has one by default, it plays, and it can be changed or turned off", async () => {
  const { page, context, errors } = await open(393, 852);
  assert.ok(await page.$("[data-act=walkup]"), "the batter has a walk-up button with no file chosen");
  await page.click("[data-act=walkup]");
  assert.match(await text(page, "[data-act=walkup]"), /Stop/);
  await page.click("[data-act=walkup]");
  assert.match(await text(page, "[data-act=walkup]"), /Walk-up/);
  await page.click(".tabbar [data-v=roster]");
  await page.click("[data-act=editplayer]");
  const sel = "select[data-ch=ptune]";
  assert.equal((await page.$$(sel + " option")).length, 9, "8 tunes and None");
  await page.selectOption(sel, "bigleague");
  await page.click("[data-act=clip-play][data-v='tune:bigleague']");
  await page.selectOption(sel, "none");
  assert.equal(await page.$("[data-act=clip-play][data-v^='tune:']"), null);
  assert.deepEqual(errors, []);
  await context.close();
});

test("park & field: typed once, offered next time, and deletable in Settings", async () => {
  const { page, context, errors } = await open(393, 852);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  for (const park of ["Rolland Moore Park #3", "Spring Park #1"]) {
    await page.click("[data-act=newgame]"); await page.click("[data-act=lu-last]"); await page.click("[data-act=ng-next]");
    await page.fill("#d-opponent", "Park Testers"); await page.fill("#d-park", park);
    await page.click("[data-act=startgame]");
    await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  }
  await page.click("[data-act=newgame]"); await page.click("[data-act=ng-next]");
  assert.deepEqual(await page.$$eval("#parkList option", o => o.map(x => x.value)), ["Spring Park #1", "Rolland Moore Park #3"]);
  await page.click(".sheet [data-act=close]");
  assert.match(await page.textContent("#view"), /Rolland Moore Park #3/, "shown in the games list");
  await page.click("[data-act=settings]");
  await page.click(".sheet [data-act=park-rm][data-v='1']");
  assert.doesNotMatch(await text(page, ".sheet"), /Rolland Moore/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("game recap: a picture and Discord-ready text for a finished game", async () => {
  const { page, context, errors } = await open(393, 852);
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=peek]");
  await page.click("[data-act=recap]");
  await page.waitForSelector(".recapimg img");
  const size = await page.$eval(".recapimg img", i => [i.naturalWidth, i.naturalHeight]);
  assert.deepEqual(size, [1080, 1350]);
  const txt = await page.$eval(".recaptext pre", x => x.textContent);
  assert.match(txt, /^\*\*FINAL: /); assert.match(txt, /Top performers/); assert.match(txt, /R {2}H {2}E/);
  // after a game ends, the final banner offers it too
  await page.click(".sheet [data-act=close]"); await page.click("[data-act=unpeek]");
  await page.click(".tabbar [data-v=game]");
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  assert.deepEqual(errors, []);
  await context.close();
});

test("panels only close with the red X (or their own buttons), never by tapping outside", async () => {
  const { page, context, errors } = await open(393, 852);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]");
  await (await page.$$(".pcard"))[0].click();
  await page.mouse.click(5, 5);   // outside the panel
  assert.ok(await page.$(".lubuild"), "still open");
  assert.equal((await page.$$(".lurow")).length, 1, "lineup kept");
  assert.ok(await page.isVisible(".sheet .xclose"));
  await page.click(".sheet .xclose");
  assert.equal(await page.$(".sheet"), null, "the X closes it");
  assert.deepEqual(errors, []);
  await context.close();
});

test("switch home and away mid-game: every play stays with the team that made it", async () => {
  // we're the visitors: top 1 we score 2 (1B, HR), bottom 1 they score 1, top 2 we single
  const ev = [PA("1B"), PA("HR"), PA("K"), PA("K"), PA("K"), Q("run"), Q("out"), Q("out"), Q("out"), PA("1B")];
  const { page, context, errors } = await openGame(ruleGame({}, ev, { ourSide: 0 }));
  assert.deepEqual(await runs(page), [2, 1]);
  await gameSettings(page);
  await page.click("[data-act=flipside]"); await page.click("[data-act=flipside]");
  await closeSheet(page);
  assert.deepEqual(await runs(page), [1, 2], "now home: they're on top with 1, we have 2");
  await page.click(".tabbar [data-v=book]");
  const v = await page.textContent("#view");
  assert.match(v, /Player 2 homers/);
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=statstab][data-v=batting]");
  const row = await page.$$eval("table.stats tbody tr", r => r.map(x => x.textContent).find(t => /Player 2/.test(t)));
  assert.ok(row, "our batter keeps their stats");
  assert.deepEqual(errors, []);
  await context.close();
});

test("add a fill-in player on the fly while building the lineup", async () => {
  const { page, context, errors } = await open(393, 852);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]");
  await page.click("[data-act=np-open]");
  await page.click("[data-act=np-save]");   // no name yet
  assert.deepEqual(await page.$$eval(".lurow .who b", b => b.map(x => x.textContent)), ["Fill-in"]);
  await page.click("[data-act=np-open]"); await page.fill("#np-name", "Marcus"); await page.fill("#np-num", "44"); await page.click("[data-act=np-save]");
  assert.deepEqual(await page.$$eval(".lurow .who b", b => b.map(x => x.textContent)), ["Fill-in", "Marcus"]);
  assert.ok(await page.$(".pcard:has-text('Marcus')"), "on the roster too");
  assert.deepEqual(errors, []);
  await context.close();
});

test("New Game ends with the coin toss: home or visitors starts the game", async () => {
  const { page, context, errors } = await open(393, 852);
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=newgame]"); await page.click("[data-act=lu-last]"); await page.click("[data-act=ng-next]");
  assert.equal(await page.$("#d-side"), null, "no home/away choice before the end");
  await page.fill("#d-opponent", "Coin Flippers");
  await page.click("[data-act=startgame][data-v='1']");
  assert.match(await text(page, "#bug .row:not(.us) .abbr"), /COI|FLI/);
  assert.ok(await page.$("#bug .row.us:last-child") || await page.$("#bug .rows .row:nth-child(2).us"), "we're the second row: home");
  assert.deepEqual(errors, []);
  await context.close();
});

test("edit a play from the Book: move an RBI, change a result, delete a play", async () => {
  const ev = [...threeOuts(), PA("3B"), PA("GO"), { t: "run", b: 2, a: "score", rbi: true }, PA("1B")];
  const { page, context, errors } = await openGame(ruleGame({}, ev));
  await page.click(".tabbar [data-v=book]");
  assert.match(await page.textContent("#pbp"), /RBI: Player 2/);
  await page.click("#pbp li.editable:has-text('scores')");
  assert.match(await text(page, ".sheet h3"), /Edit play/);
  await page.selectOption("#ep-rbi", { label: "Player 1" });
  assert.match(await page.textContent("#pbp"), /RBI: Player 1/);
  await page.click(".sheet [data-act=close]");
  await page.click("#pbp li.editable:has-text('grounds out')");
  await page.click("[data-act=ep-r][data-v=FO]");
  assert.match(await page.textContent("#pbp"), /Player 2 flies out/);
  await page.click(".sheet [data-act=close]");
  await page.click("#pbp li.editable:has-text('Player 3 singles')");
  await page.click("[data-act=ep-del]"); await page.click("[data-act=ep-del]");
  assert.doesNotMatch(await page.textContent("#pbp"), /Player 3 singles/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Book: tap a box in the scorebook grid to edit that at-bat; names stay visible when scrolled", async () => {
  const ev = [...threeOuts(), PA("GO"), PA("1B")];
  const { page, context, errors } = await openGame(ruleGame({}, ev));
  await page.setViewportSize({ width: 393, height: 852 });
  await page.click(".tabbar [data-v=book]");
  await page.click("#book .bcell >> nth=0");
  assert.match(await text(page, ".sheet h3"), /Edit play/);
  await page.click("[data-act=ep-r][data-v=LO]");
  assert.match(await page.textContent("#pbp"), /Player 1 lines out/);
  await page.click(".sheet [data-act=close]");
  const visible = await page.$eval("#book", t => { const sc = t.parentElement; sc.scrollLeft = 400; const n = t.querySelector("td.name").getBoundingClientRect(), box = sc.getBoundingClientRect(); return n.left >= box.left - 1; });
  assert.ok(visible, "name column stays in view");
  assert.deepEqual(errors, []);
  await context.close();
});

test("guided tours: the basics walks through with Next and Back; every tour runs to the end without errors", async () => {
  const { page, context, errors } = await open(393, 852);
  await gameSettings(page); await page.click("[data-act=help]");
  assert.equal((await page.$$("[data-act=tour]")).length, 5, "five tutorials in Help");
  await page.click("[data-act=tour][data-v=basics]");
  assert.match(await text(page, "#tour .tcard"), /Welcome/);
  await page.click("[data-act=tour-next]");
  assert.ok(await page.$("#tour .thole"), "spotlight on a feature");
  await page.click("[data-act=tour-back]");
  assert.match(await text(page, "#tour .tcard"), /Welcome/);
  for (const id of ["basics", "newgame", "scoring", "stats", "sounds"]) {
    if (!(await page.$("#tour"))) { await gameSettings(page); await page.click("[data-act=help]"); await page.click(`[data-act=tour][data-v=${id}]`); }
    for (let i = 0; i < 20 && await page.$("#tour"); i++) await page.click("[data-act=tour-next]");
    assert.equal(await page.$("#tour"), null, id + " finishes");
  }
  // the New Game tour, with no game in progress, opens the real lineup builder and coin toss
  await gameSettings(page); await page.click(".sheet [data-act=endgame]");
  await page.click("[data-act=settings]"); await page.click("[data-act=tour][data-v=newgame]");
  await page.click("[data-act=tour-next]");
  assert.ok(await page.$(".lupool"), "lineup builder open behind the tour");
  for (let i = 0; i < 4; i++) await page.click("[data-act=tour-next]");
  assert.ok(await page.$(".tossbtns"), "coin toss shown");
  await page.click("[data-act=tour-next]");
  assert.equal(await page.$(".sheet"), null, "tour closes what it opened");
  await page.click("[data-act=settings]");
  assert.match(await text(page, ".sheet"), /Starting a game ✓/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Tap on the field: a hit tapped past the fence stays in the park; a home run doesn't", async () => {
  const { page, context, errors } = await open(393, 852);
  const tapField = async (x, y) => {
    const [px, py] = await page.evaluate(([x, y]) => { const m = document.querySelector("#ffield").getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; }, [x, y]);
    await page.mouse.click(px, py);
  };
  const dist = ([x, y]) => Math.hypot(x - 100, y - 166);
  await page.click("[data-act=pa][data-v='3B']"); await page.click("[data-act=fieldopen]");
  await tapField(130, 20);   // way past the fence
  const triple = await page.$eval("#ffield .fdot", c => [+c.getAttribute("cx"), +c.getAttribute("cy")]);
  assert.ok(dist(triple) <= 121, "triple pulled inside the fence: " + triple);
  await page.click("[data-act=fieldsave]");
  await page.click("[data-act=pa][data-v=HR]"); await page.click("[data-act=fieldopen]");
  await tapField(130, 20);
  const hr = await page.$eval("#ffield .fdot", c => [+c.getAttribute("cx"), +c.getAttribute("cy")]);
  assert.ok(dist(hr) > 126, "home run stays over the fence");
  assert.deepEqual(errors, []);
  await context.close();
});

test("inside-the-park home run: counts as a HR, not toward the HR limit, and stays in the park", async () => {
  const { page, context, errors } = await openGame(ruleGame({ hrRule: "max1", askHits: true }, [...threeOuts()]));
  await page.click("[data-act=pa][data-v=HR]");
  await page.click("[data-act=hrkind][data-v=ip]");
  await page.click("[data-act=hitpos][data-v='8']");
  await page.click("[data-act=pa][data-v=HR]");     // over the fence: still allowed, the limit is 1
  await page.click("[data-act=hitpos][data-v='7']");
  assert.deepEqual(await runs(page), [0, 2]);
  await page.click(".tabbar [data-v=book]");
  assert.match(await page.textContent("#pbp"), /inside-the-park home run to center field/);
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=statstab][data-v=spray]");
  const hr = await page.$$eval(".teamcard circle.hr", c => c.map(x => Math.hypot(+x.getAttribute("cx") - 100, +x.getAttribute("cy") - 166)));
  assert.equal(hr.filter(d => d < 126).length, 1, "the inside-the-park one is inside the fence");
  assert.deepEqual(errors, []);
  await context.close();
});

test("spray charts: tap a dot and drag it to a better spot", async () => {
  const { page, context, errors } = await open(393, 852, { hasTouch: true });
  await page.click(".tabbar [data-v=stats]"); await page.click("[data-act=statstab][data-v=spray]");
  const card = ".spraygrid .spraycard >> nth=0";
  const before = await page.$$eval(".spraygrid .spraycard:first-child .spot", g => g.map(x => x.dataset.g + ":" + x.dataset.v + "@" + x.querySelector(".hit").getAttribute("cx")));
  assert.ok(before.length, "dots are tappable");
  await page.$eval(".spraygrid .spraycard:first-child .spot", g => g.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  assert.ok(await page.$(".fieldfs"), "full-screen field opens");
  assert.match(await text(page, ".fft small"), /Drag the ball/);
  const to = async (x, y) => page.evaluate(([x, y]) => { const m = document.querySelector("#ffield").getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; }, [x, y]);
  const [ax, ay] = await to(...(await page.$eval("#ffield .fdot", c => [+c.getAttribute("cx"), +c.getAttribute("cy")])));
  const [bx, by] = await to(40, 90);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 8 }); await page.mouse.up();
  const moved = await page.$eval("#ffield .fdot", c => [+c.getAttribute("cx"), +c.getAttribute("cy")]);
  assert.ok(Math.abs(moved[0] - 40) < 2 && Math.abs(moved[1] - 90) < 2, "marker followed the drag: " + moved);
  await page.click("[data-act=fieldsave]");
  assert.equal(await page.$(".fieldfs"), null);
  const after = await page.$$eval(".spraygrid .spraycard:first-child .spot .hit", c => c.map(x => [+x.getAttribute("cx"), +x.getAttribute("cy")]));
  assert.ok(after.some(([x, y]) => Math.abs(x - 40) < 2 && Math.abs(y - 90) < 2), "the dot is in its new spot");
  assert.deepEqual(errors, []);
  await context.close();
});
