# ScoreKeep

A softball scorebook for an iPad or Raspberry Pi sitting in the dugout. Tap what happened and it keeps the score, the base runners, a classic scorebook grid and season-long stats.

**Open the app:** https://crossfirebull.github.io/dugout-scorebook/

## Getting around

A tab bar along the bottom has five pages, so there's little scrolling:

- **Game**: a TV-style score bug (team blocks in your colors, runs, inning, bases and outs; tap a lit base to move a runner), the batter, and the scoring buttons. Fits one screen on a phone. Softball has no balls-and-strikes count, so there isn't one.
- **Book**: the full inning-by-inning line score, the scorebook grid and play-by-play.
- **Stats**: Overview (games and leaders), Batting tables, Spray charts (a whole-team chart with All / Hits / Outs filters, then one per player) and Lineups, for any season.
- **Scout**: every team you've played, with a spray chart for the team and each of its hitters, and where to shade your defense.
- **Team**: your team name and colors up top (**Edit team** changes them), then the roster. Tap a player to edit their number, up to three positions, batting side and walk-up song. **+ Add player** sits right under the list.

ScoreKeep picks a layout for the screen it's on, and switches when you rotate the device:

- **Phone, upright:** everything stacked on one screen, tabs along the bottom.
- **Phone on its side, or a small landscape screen like a Raspberry Pi touchscreen:** score bug and batter on the left, buttons on the right, tabs in a slim rail on the left edge.
- **Tablet, upright:** bigger buttons and score bug, plus who's on deck and the last few plays.
- **Tablet on its side, or a computer:** two columns, with the score bug, batter, on deck and last plays on the left, large buttons on the right, and tabs in a side rail.

To see every layout at once, open the **screen preview**: https://crossfirebull.github.io/dugout-scorebook/preview.html. It shows ScoreKeep on an iPhone, an iPhone on its side, a Raspberry Pi 7" screen, an iPad mini, an iPad, an iPad on its side and a laptop. The preview uses its own practice data, so it never touches your real games.

The speaker button at the top mutes and unmutes. The gear opens **Settings** (team, colors, new-game defaults, sounds, backup, and the welcome setup again). During a game it opens that game's settings, with a link to all settings.

## First launch

The first time ScoreKeep opens, a short setup walks you through it like the opening screens of a video game: name your team, pick your colors (with a live preview of the score bug and Home Screen icon), choose Dugout or Scorekeeper mode, set your league's innings and tie rule, and add your players. Or tap **Look around with sample data first** to explore a made-up season. Everything you choose can be changed later in **Settings**, and **Run the welcome setup again** is there too.

## Using it at the field

1. Turn on your phone's hotspot and connect the iPad.
2. On the **Team** tab, tap **Edit team** and set your team colors first, then open the link in Safari and tap **Share → Add to Home Screen**. The icon (a scorebook with a lit R·H·E box score) is drawn in your team colors at that moment.
3. On the **Team** tab, add your players with their number, up to three positions (main one first) and which side they bat from.
4. On game day, tap **New Game**. A pregame checklist covers the opponent, lineup, game settings, sound, walk-up songs and your last backup, each with a check mark when it's ready. Set the batting order and positions. Each player's own positions are offered first, a position that's taken is locked for everyone else, and bench players are one tap away. Pick a mode in **Game settings**:
   - **Dugout mode** scores your batters one at a time. The other team's half-inning gets quick **+1 Run** and **+1 Out** buttons, so you can coach and score at the same time.
   - **Scorekeeper mode** scores every batter on both teams.
5. After the last inning, tap **Save to season** (or **Play another inning** for extras; the **+** next to the line score adds one any time). A game cut short by a time limit can be ended from Game settings with **End game now**. If your league allows ties, a tie counts as a tie in the record.
6. Saved games add to everyone's stats on the **Stats** tab. Start a fresh season (Spring, Summer or Fall) with **New Season** on the Stats tab; past seasons stay saved, and the season menu switches between them or shows all seasons together. **Stats → Lineups** shows who batted where and played which position in every game.

## Scoring a play

Tap what the batter did. The app moves the runners the usual way, and you can fix anything by tapping a base.

- **Batter reaches:** 1B, 2B, 3B, HR, BB (walk), E (error), and **FC** (fielder's choice: a runner is out, the batter is safe). FC asks which runner was out, or whether everyone was safe, and is grayed out with nobody on base.
- **Batter out:** K swinging, backwards K looking, GO, F, L, P, SF (sac fly), DP, **HR out** (for leagues with a home run limit) and **FBO** (foul ball out).
- **Where it went:** with **Hit location** on, the app asks which fielder made the play or where the hit landed, for spray charts and fielding stats. Every question has **Skip**.
- **Moving runners:** tap a runner's base to advance, steal, score or put them out. Right after a play, scoring a runner offers **Scored on the play** (RBI to the batter) or **Scored, no RBI** (error, overthrow, passed ball). A steal of home is never an RBI.
- **Undo** takes back the last tap, as many times as you need.

## Keeping your data safe

- **Works with no signal.** After you open ScoreKeep once with a connection, it keeps a copy of itself on the device and opens and scores with no signal at all. Updates arrive the next time it's online.
- **Saves every tap** on the device as you go, so closing the app, a dead battery or losing signal mid-inning doesn't lose anything. Tap the wrong thing? **Undo**.
- **Protected storage.** ScoreKeep asks the device to keep its data out of the browser's automatic cleanup. Using it from the Home Screen icon helps too.
- **Never overwrites a problem.** If saved data ever can't be read, ScoreKeep sets it aside and tells you rather than starting over on top of it. If a save ever fails (for example in Private Browsing), a red warning appears.
- **Backups in one tap.** **Stats → Overview → Export & backup → Save backup** opens the share sheet on iPhone and iPad: save to Files or iCloud Drive, or email it to yourself. A reminder appears when it's been more than a week. **Restore from backup** brings everything back on any device.

## Sounds and walk-up songs

Open **Settings → Sounds** (the gear), the **Sounds** row in Game settings, or **Team → Walk-up songs** to pick your own audio files from the iPad (MP3, M4A or WAV; the Files app is the easiest place to keep them). You can set a sound for home runs, runs scoring, hits, walks, strikeouts, other outs and the end of an inning, plus a walk-up song for each player. Each clip has its own start time, length and volume, so one full song can supply a 15-second snippet.

Sounds play in order, so the next batter's walk-up starts when the previous play's sound ends. The app knows which team is yours and what the score is. Hits and runs play when you bat, strikeouts and outs when you're in the field. Situation sounds cover taking the lead, tying it, a rally when you're tied or behind with a runner in scoring position, a big defensive out, and the win. Add a few **between-innings** songs and one plays after every third out.

The files stay on the iPad. They aren't uploaded to GitHub and aren't in the backup file, so you never need to commit anything to change a sound.

## Stats it tracks

- **Standard:** G, PA, AB, R, H, 2B, 3B, HR, RBI, BB, K, SB, AVG, OBP, SLG, OPS
- **Advanced:** wOBA, ISO, BABIP, K%, BB%, BB/K, AVG with runners in scoring position, runs created, reached on error
- **Batted ball:** grounder / line drive / fly ball / pop-up rates, and pull / center / opposite-field rates
- **Fielding:** positions played, plays made, errors, fielding %

Stats are recalculated from the play-by-play every time, so new stats added later apply to every game already scored.

## What's in this repository

| File | What it is |
| --- | --- |
| `index.html` | The whole app: one file, with no install needed. |
| `icons/`, `manifest.webmanifest` | The Home Screen icon and app name for phones and tablets. |
| `sw.js` | Offline support: keeps a copy of the app on the device. |
| `tests/`, `package.json`, `.github/workflows/tests.yml` | Automated checks that play through the app on GitHub after every change. |
| `python/` | A five-step tutorial that builds the same scorebook in Python. Start with `python/README.md`. |

## Making changes

Edit `index.html`, then commit and push. GitHub Pages republishes the site in about a minute. Close and reopen the app on the iPad to get the new version.

To run the automated checks on your own computer: `npm install`, then `npm test`. GitHub runs them after every push too.

## On the list

- **A new name.** ScoreKeep is taken (scorekeep.net), so the app will be renamed. Saved games won't be affected.
- **Polish each screen on its own display:** phone, phone on its side, Raspberry Pi, iPad mini, iPad, iPad on its side and laptop.
- Automatic +2 home run limit rule and other league-specific rules.
- A baseball / softball switch.
- Share a game summary.
- Sync between devices.
- Better built-in sounds, or a free sound library.
