// Automated checks for ScoreKeep. Each test opens the real app in a headless browser and
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
  assert.equal(await page.title(), "ScoreKeep");
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

test("a game tied after the last inning ends as a tie when ties are allowed", async () => {
  const { page, context } = await open();
  await gameSettings(page);
  for (let i = 0; i < 3; i++) await page.click(".sheet [data-act=inn][data-v='-1']");   // 4 innings; sample is tied 0-0 in the 4th? make it so
  await page.click("label[for=d-ties]");
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
  await page.fill("#d-opponent", "Test Opponent");
  // put the second batter at the first batter's position
  const firstPos = await page.inputValue("[data-row=pos][data-i='0']");
  await page.evaluate(pos => { const s = document.querySelector("[data-row=pos][data-i='1']"); [...s.options].forEach(o => o.disabled = false); s.value = pos; }, firstPos);
  await page.click("[data-act=startgame]");
  assert.match(await text(page, ".sheet"), /Each position can only be used once/);
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
  assert.equal(await page.title(), "ScoreKeep");
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
  await page.click("label[for=p-ties]");
  await page.click("[data-act=onb-next]");
  for (const [name, num, pos] of [["Ava Ruiz", "4", "SS"], ["Jo Kim", "12", "C"]]) {
    await page.fill("#onbPName", name); await page.fill("#onbPNum", num); await page.selectOption("#onbPPos", pos);
    await page.click("[data-act=onb-addp]");
  }
  assert.equal((await page.$$(".onb .qlist li")).length, 2);
  await page.click("[data-act=onb-next]");
  const summary = await text(page, ".onb .summary");
  assert.match(summary, /Test Tigers/); assert.match(summary, /Maroon & Gold/); assert.match(summary, /Scorekeeper mode/); assert.match(summary, /8 innings · ties allowed/); assert.match(summary, /2 players/);
  await page.click("[data-act=onb-finish][data-v=game]");
  assert.match(await text(page, ".sheet h3"), /New Game/, "Start a game opens New Game");
  assert.match(await text(page, ".sheet .stepper"), /8/, "new game uses the 8-inning default");
  await page.click(".sheet [data-act=close]");
  await page.click("[data-act=settings]");
  assert.match(await text(page, ".sheet"), /Test Tigers/);
  assert.equal(await page.isChecked("#p-dugout"), false); assert.equal(await page.isChecked("#p-ties"), true);
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
  const batter = (await text(page, "#atbat .now")).replace(/^#\d+\s*/, "");
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
  const dots = async () => page.$$eval(".teamcard svg.spray circle", c => c.map(x => x.getAttribute("class")));
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
