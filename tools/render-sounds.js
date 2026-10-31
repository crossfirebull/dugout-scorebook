// Records every built-in ScoreKept sound to sounds/library/*.mp3 and list.json, for the sound library page.
// Run from the repo: python3 -m http.server 8777 & node tools/render-sounds.js   (needs Playwright and ffmpeg)
const { chromium } = require('playwright'); const fs = require('fs'); const { execFileSync } = require('child_process');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:8777/index.html'); await p.waitForTimeout(500);
  const list = await p.evaluate(() => window.scoreKeptSounds.list());
  const out = [];
  for (const s of list) {
    const r = await p.evaluate(k => window.scoreKeptSounds.render(k), s.key);
    const n = r.ch[0].length, buf = Buffer.alloc(44 + n * 4);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(r.sr, 24); buf.writeUInt32LE(r.sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r.ch[c][i])) * 32767), 44 + i * 4 + c * 2);
    const file = s.key.replace(/^wu-/, 'walkup-') + '.mp3', wav = '/tmp/' + s.key + '.wav';
    fs.writeFileSync(wav, buf);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-b:a', '128k', require('path').join(__dirname, '..', 'sounds', 'library') + '/' + file]);
    out.push(Object.assign({ file, secs: +r.len.toFixed(1) }, s));
  }
  fs.writeFileSync(require('path').join(__dirname, '..', 'sounds', 'library', 'list.json'), JSON.stringify(out, null, 1));
  console.log(out.length, 'sounds'); await b.close();
})();
