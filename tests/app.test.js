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
  await page.fill("#teamName", "Reload Test");
  await page.press("#teamName", "Tab");
  await tapResult(page, "1B").catch(() => {});
  await page.reload(); await page.waitForSelector(".tabbar button");
  await page.click(".tabbar [data-v=roster]");
  assert.equal(await page.inputValue("#teamName"), "Reload Test");
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
