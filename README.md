# Dugout Scorebook

A softball scorebook for an iPad or Raspberry Pi sitting in the dugout. Tap what happened and it keeps the line score, the count, the base runners and a classic scorebook grid.

**Open the app:** `https://<your-github-username>.github.io/dugout-scorebook/`

## Using it at the field

1. Turn on your phone's hotspot and connect the iPad.
2. Open the link above in Safari. Tap **Share → Add to Home Screen** so it opens like an app.
3. On the **Roster** tab, add your players with their number, usual position and which side they bat from.
4. On game day, tap **Start a game**, then set the batting order and positions.
5. When the game ends, tap **Save to season**. The **Season** tab adds it to everyone's stats.

Games are saved on the iPad as you go, so closing Safari or losing signal mid-inning doesn't lose anything. If you tap the wrong thing, use **Undo**. Every so often, use **Season → Export & backup → Download backup** so a lost iPad doesn't mean a lost season.

## Sounds and walk-up songs

Tap **Sounds** at the top to pick your own audio files from the iPad (MP3, M4A or WAV; the Files app is the easiest place to keep them). You can set a sound for home runs, runs scoring, hits, walks, strikeouts, other outs and the end of an inning, plus a walk-up song for each player. Each clip has its own start time, length and volume, so one full song can supply a 15-second snippet.

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
| `python/` | A five-step tutorial that builds the same scorebook in Python. Start with `python/README.md`. |

## Making changes

Edit `index.html`, then commit and push. GitHub Pages republishes the site in about a minute. Refresh Safari on the iPad to get the new version.
