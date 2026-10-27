// A five-game season simulator with its own hand scorer, written separately from the app.
// It plays random but realistic games, records them as the taps a scorekeeper would make,
// and keeps its own stat sheet the way you'd keep one on paper. The tests load the taps into
// ScoreKept and check that the app's Stats tables match this sheet.

const ROSTER = [
  ["p1", "Avery Cole", "2", "R"], ["p2", "Blake Ruiz", "7", "L"], ["p3", "Casey Moore", "11", "R"],
  ["p4", "Drew Patel", "14", "R"], ["p5", "Emerson Hall", "21", "L"], ["p6", "Finley Brooks", "3", "R"],
  ["p7", "Gray Ortiz", "9", "R"], ["p8", "Harper Lane", "18", "L"], ["p9", "Indy Shaw", "24", "R"],
  ["p10", "Jordan Price", "5", "R"], ["p11", "Kai Morgan", "33", "L"]
];
const FIELD = ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "RCF", "RF"];
const OPPONENTS = ["Lakeside Lightning", "Mill Creek Hornets", "Westbrook Blaze", "Pine Ridge Rebels", "Harbor City Heat"];
const INNINGS = 7;

// Seeded random numbers, so the same season is played every run
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const blank = () => ({ G: 0, PA: 0, AB: 0, R: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0, RBI: 0, BB: 0, K: 0, SF: 0,
  ROE: 0, HRO: 0, FBO: 0, TB: 0, RAB: 0, RH: 0 });

function simulateSeason(seed = 2026) {
  const R = rng(seed), pick = list => list[Math.floor(R() * list.length)];
  const sheet = Object.fromEntries(ROSTER.map(([id]) => [id, blank()]));
  const games = [], results = [];

  for (let gi = 0; gi < 5; gi++) {
    const ourSide = gi % 2, mode = gi < 3 ? "dugout" : "scorekeeper";
    // A different batting order each game; the first ten play the field, the last bats only
    const order = ROSTER.slice().sort(() => R() - .5);
    const ourLineup = order.map(([pid, name], i) => ({ pid, name, pos: FIELD[i] || "" }));
    const oppLineup = mode === "scorekeeper" ? Array.from({ length: 10 }, (_, i) => ({ pid: null, name: "Opp " + (i + 1), pos: FIELD[i] })) : [];
    const lineups = ourSide === 0 ? [ourLineup, oppLineup] : [oppLineup, ourLineup];
    const events = [];
    const g = { inning: 1, half: 0, outs: 0, bases: [null, null, null], runs: [0, 0], order: [0, 0], final: false, lastPA: null, played: new Set() };
    const ours = () => g.half === ourSide;
    const homeLeadsLate = () => g.half === 1 && g.inning >= INNINGS && g.runs[1] > g.runs[0];

    const score = (runner, rbiTo) => {
      g.runs[g.half]++;
      if (runner.pid) sheet[runner.pid].R++;
      if (rbiTo) sheet[rbiTo].RBI++;
      if (homeLeadsLate()) g.final = true;   // walk-off: the game ends the moment the home team leads
    };
    const endHalf = () => {
      g.bases = [null, null, null]; g.outs = 0; g.lastPA = null;
      if (g.half === 0) {
        if (g.inning >= INNINGS && g.runs[1] > g.runs[0]) { g.final = true; return; }
        g.half = 1;
      } else {
        if (g.inning >= INNINGS && g.runs[0] !== g.runs[1]) { g.final = true; return; }
        g.half = 0; g.inning++;
      }
    };
    const out = () => { g.outs++; };

    // One batter. Returns nothing; updates the game, the sheet and the list of taps.
    const plateAppearance = () => {
      const t = g.half, lu = lineups[t], slot = g.order[t] % lu.length, batter = lu[slot], pid = batter.pid;
      const b = g.bases, risp = !!(b[1] || b[2]);
      const choices = [["1B", 22], ["2B", 7], ["3B", 2], ["HR", 3], ["BB", 8], ["K", 9], ["KC", 3], ["GO", 15], ["FO", 11], ["LO", 4], ["PO", 5],
        ["E", 4], ["HRO", 1], ["FBO", 1]];
      if (b[2] && g.outs < 2) choices.push(["SF", 6]);
      if (b.some(Boolean)) choices.push(["FC", 4]);
      if (b[0] && g.outs < 2) choices.push(["DP", 4]);
      let roll = R() * choices.reduce((a, c) => a + c[1], 0), r = choices[0][0];
      for (const [k, w] of choices) { if ((roll -= w) < 0) { r = k; break; } }
      const hit = ["1B", "2B", "3B", "HR"].includes(r);
      const p = hit ? pick([7, 8, 9, 10, 11, 4, 6]) : ["GO", "E", "FC", "DP"].includes(r) ? pick([1, 3, 4, 5, 6]) : ["FO", "SF"].includes(r) ? pick([7, 8, 9, 10, 11]) : ["LO", "PO"].includes(r) ? pick([2, 3, 4, 5, 6]) : undefined;
      const ev = { t: "pa", r };
      if (p) ev.p = p;
      if (hit) ev.bb = pick(["GB", "LD", "LD", "FB"]);

      const s = pid ? sheet[pid] : null;
      if (s) {
        if (!g.played.has(pid)) { g.played.add(pid); s.G++; }
        s.PA++;
        if (!["BB", "SF"].includes(r)) { s.AB++; if (risp) s.RAB++; }
        if (hit) { s.H++; s[r]++; s.TB += { "1B": 1, "2B": 2, "3B": 3, HR: 4 }[r]; if (risp) s.RH++; }
        if (r === "K" || r === "KC") s.K++;
        if (["BB", "SF", "HRO", "FBO"].includes(r)) s[r]++;
        if (r === "E") s.ROE++;
      }
      const me = { pid };
      let runs = 0;
      const sc = x => { if (g.final && r !== "HR") return; score(x); runs++; };   // after a walk-off, only a home run keeps scoring
      const advance = n => { for (let i = 2; i >= 0; i--) { const x = b[i]; if (!x) continue; b[i] = null; if (i + n >= 3) sc(x); else b[i + n] = x; } };
      const force = () => {
        if (!b[0]) return;
        if (b[1]) { if (b[2]) { const x = b[2]; b[2] = null; sc(x); } b[2] = b[1]; }
        b[1] = b[0]; b[0] = null;
      };
      const was = b.slice();   // who was where before the play
      switch (r) {
        case "1B": advance(1); b[0] = me; break;
        case "2B": advance(2); b[1] = me; break;
        case "3B": advance(3); b[2] = me; break;
        case "HR": advance(3); sc(me); break;
        case "BB": case "E": force(); b[0] = me; break;
        case "SF": out(); if (g.outs < 3 && b[2]) { const x = b[2]; b[2] = null; sc(x); } break;
        case "FC": {
          const occupied = [0, 1, 2].filter(i => b[i]);
          const fcOut = R() < .15 ? -1 : (b[0] ? 0 : pick(occupied));
          ev.out = fcOut;
          if (fcOut >= 0) { b[fcOut] = null; out(); }
          if (g.outs < 3) { force(); b[0] = me; }
          break;
        }
        case "DP": b[0] = null; out(); if (g.outs < 3) out(); break;
        default: out();   // K, KC, GO, FO, LO, PO, HRO, FBO
      }
      if (s && !["E", "DP"].includes(r)) s.RBI += runs;
      events.push(ev);
      g.order[t]++;
      g.lastPA = ["1B", "2B", "3B", "BB", "GO", "FO", "LO", "PO", "SF", "FC"].includes(r) ? { pid, t } : null;
      if (g.outs >= 3) { endHalf(); return; }
      if (g.final || !ours()) return;

      // What a scorekeeper taps next: runners who took the extra base on the play
      const tapScore = (base, rbi) => { const x = b[base]; b[base] = null; events.push(Object.assign({ t: "run", b: base, a: "score" }, rbi ? { rbi: true } : {})); score(x, rbi && g.lastPA ? g.lastPA.pid : null); };
      if (r === "1B" && b[2] && b[2] === was[1] && R() < .6) tapScore(2, true);
      else if (r === "1B" && b[1] && b[1] === was[0] && !b[2] && R() < .25) { b[2] = b[1]; b[1] = null; events.push({ t: "run", b: 1, a: "adv" }); }
      if (g.final) return;
      if (r === "2B" && b[2] && b[2] === was[0] && R() < .5) tapScore(2, true);
      if (g.final) return;
      if (["GO", "FO", "LO", "PO"].includes(r) && b[2] && R() < .35) tapScore(2, true);
    };

    // Between batters: passed balls and overthrows move runners up (no stealing in softball), runners picked off
    const runnerPlays = () => {
      const b = g.bases;
      if (b[2] && R() < .04) {                     // passed ball: scores, no RBI
        const x = b[2]; b[2] = null; events.push({ t: "run", b: 2, a: "score" }); score(x); return;
      }
      if (b[2] && R() < .02) {                     // overthrow: scores, no RBI
        const x = b[2]; b[2] = null; events.push({ t: "run", b: 2, a: "score" }); score(x); return;
      }
      if (b[1] && !b[2] && R() < .08) { const x = b[1]; b[1] = null; b[2] = x; events.push({ t: "run", b: 1, a: "adv" }); return; }
      if (b[0] && !b[1]) {
        const roll = R();
        if (roll < .12) { const x = b[0]; b[0] = null; b[1] = x; events.push({ t: "run", b: 0, a: "adv" }); }
        else if (roll < .15) { b[0] = null; events.push({ t: "run", b: 0, a: "out" }); out(); if (g.outs >= 3) endHalf(); }
      }
    };

    // Dugout mode: the other team's half is just runs and outs
    const quickHalf = () => {
      while (!g.final && g.half !== ourSide) {
        if (R() < .32) { events.push({ t: "quick", k: "run" }); g.runs[g.half]++; if (homeLeadsLate()) g.final = true; }
        else { events.push({ t: "quick", k: "out" }); out(); if (g.outs >= 3) endHalf(); }
      }
    };

    let guard = 0;
    while (!g.final && guard++ < 2000) {
      if (!ours() && mode === "dugout") { quickHalf(); continue; }
      const half = g.half + ":" + g.inning;
      if (ours()) runnerPlays();
      if (g.final || g.half + ":" + g.inning !== half) continue;
      plateAppearance();
    }
    const us = g.runs[ourSide], them = g.runs[1 - ourSide];
    results.push({ opponent: OPPONENTS[gi], us, them, innings: g.inning });
    games.push({
      id: "sim" + (gi + 1), seasonId: "season1", date: `2026-09-${String(5 + gi * 6).padStart(2, "0")}`, opponent: OPPONENTS[gi],
      opponentAbbr: OPPONENTS[gi].slice(0, 4).toUpperCase(), ourSide,
      settings: { innings: INNINGS, mode, askHits: true, ties: false }, lineups, events, done: true
    });
  }

  const store = {
    v: 2, sample: false, onboarded: true, lastBackup: Date.now(),
    team: { name: "Sim Sluggers", abbr: "SIM", players: ROSTER.map(([id, name, num, bats], i) => ({ id, name, num, pos: FIELD[i] || "", alt: [], bats })) },
    games, currentId: null, seasons: [{ id: "season1", name: "Fall 2026", start: "2026-09-01" }], currentSeasonId: "season1",
    prefs: {}, audio: {}
  };
  return { store, sheet, results, names: Object.fromEntries(ROSTER.map(([id, name]) => [id, name])) };
}

// Rate stats, worked out from the sheet with the usual formulas
function rates(s) {
  const d = (a, b) => b > 0 ? a / b : null;
  const AVG = d(s.H, s.AB), OBP = d(s.H + s.BB, s.AB + s.BB + s.SF), SLG = d(s.TB, s.AB);
  return {
    AVG, OBP, SLG, OPS: OBP != null && SLG != null ? OBP + SLG : null, ISO: SLG != null ? SLG - AVG : null,
    // Home runs ruled outs and foul-ball outs never stayed in play, so they're left out like strikeouts
    BABIP: d(s.H - s.HR, s.AB - s.K - s.HR - s.HRO - s.FBO + s.SF),
    wOBA: d(.69 * s.BB + .88 * s["1B"] + 1.25 * s["2B"] + 1.59 * s["3B"] + 2.05 * s.HR, s.AB + s.BB + s.SF),
    "K%": d(s.K, s.PA), "BB%": d(s.BB, s.PA), "RISP AVG": d(s.RH, s.RAB),
    RC: s.AB + s.BB > 0 ? (s.H + s.BB) * s.TB / (s.AB + s.BB) : null
  };
}

module.exports = { simulateSeason, rates };
