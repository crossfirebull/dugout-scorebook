# ScoreKeep

A softball scorebook for an iPad or Raspberry Pi sitting in the dugout. Tap what happened and it keeps the score, the base runners, a classic scorebook grid and season-long stats.

**Open the app:** https://crossfirebull.github.io/dugout-scorebook/

## Getting around

A tab bar along the bottom has five pages, so there's little scrolling:

- **Game**: a TV-style score bug (team blocks in your colors, runs, inning, bases and outs; tap a lit base to move a runner), the batter, and the scoring buttons. Fits one screen on a phone. Softball has no balls-and-strikes count, so there isn't one.
- **Book**: the full inning-by-inning line score, the scorebook grid and play-by-play.
- **Stats**: Overview (games and leaders), Batting tables, Spray charts and Lineups, for any season.
- **Scout**: every team you've played, with a spray chart for the team and each of its hitters, and where to shade your defense.
- **Team**: your roster, positions, walk-up songs and **team colors**. Pick a primary and a secondary color from a palette of common uniform colors; the app name, scoreboard, buttons and tabs pick them up, and the app keeps every combination readable.

The speaker button at the top mutes and unmutes. The gear opens Game Settings during a game, or Sounds otherwise.

## Using it at the field

1. Turn on your phone's hotspot and connect the iPad.
2. On the **Team** tab, set your team colors first, then open the link in Safari and tap **Share → Add to Home Screen**. The icon (a scorebook with a lit R·H·E box score) is drawn in your team colors at that moment.
3. On the **Roster** tab, add your players with their number, up to three positions (main one first) and which side they bat from.
4. On game day, tap **New Game**. A pregame checklist covers the opponent, lineup, game settings, sound, walk-up songs and your last backup, each with a check mark when it's ready. Set the batting order and positions. Each player's own positions are offered first, a position that's taken is locked for everyone else, and bench players are one tap away. Pick a mode in **Game settings**:
   - **Dugout mode** scores your batters one at a time. The other team's half-inning gets quick **+1 Run** and **+1 Out** buttons, so you can coach and score at the same time.
   - **Scorekeeper mode** scores every batter on both teams.
5. When the game ends, tap **Save to season**. Start a fresh season any time with **Season → New Season**; past seasons stay saved and you can switch between them (or see all seasons together) from the season menu. The **Season** tab adds it to everyone's stats, and **Season → Lineups** shows who batted where and played which position in every game.

Games are saved on the iPad as you go, so closing Safari or losing signal mid-inning doesn't lose anything. If you tap the wrong thing, use **Undo**. Every so often, use **Season → Export & backup → Download backup** so a lost iPad doesn't mean a lost season.

## Sounds and walk-up songs

Open **Game Settings → Sounds & walk-up songs** (or **Roster → Walk-up songs & sounds**) to pick your own audio files from the iPad (MP3, M4A or WAV; the Files app is the easiest place to keep them). You can set a sound for home runs, runs scoring, hits, walks, strikeouts, other outs and the end of an inning, plus a walk-up song for each player. Each clip has its own start time, length and volume, so one full song can supply a 15-second snippet.

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
| `python/` | A five-step tutorial that builds the same scorebook in Python. Start with `python/README.md`. |

## Making changes

Edit `index.html`, then commit and push. GitHub Pages republishes the site in about a minute. Refresh Safari on the iPad to get the new version.
