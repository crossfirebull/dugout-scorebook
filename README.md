# ScoreKept

A softball scorebook for an iPad or Raspberry Pi sitting in the dugout. Tap what happened and it keeps the score, the base runners, a classic scorebook grid and season-long stats.

**Open the app:** https://crossfirebull.github.io/dugout-scorebook/

## Getting around

A tab bar along the bottom has five pages, so there's little scrolling:

- **Game**: a TV-style score bug (team blocks in your colors, runs, inning, bases and outs; tap a lit base to move a runner), the batter, and the scoring buttons. Fits one screen on a phone. Softball has no balls-and-strikes count, so there isn't one.
- **Book**: the full inning-by-inning line score, the scorebook grid and play-by-play.
- **Stats**: Overview (games and leaders), Batting tables, Charts (spray charts: a whole-team chart with All / Hits / Outs filters, then one per player) and Lineups, for any season.
- **Scout**: every team you've played, with a spray chart for the team and each of its hitters, and where to shade your defense.
- **Team**: your team name and colors up top (**Edit team** changes them), then the roster. Tap a player to edit their number, up to three positions, batting side and walk-up song. **+ Add player** sits right under the list.

ScoreKept picks a layout for the screen it's on, and switches when you rotate the device:

- **Phone, upright:** everything stacked on one screen, tabs along the bottom.
- **Phone on its side, or a small landscape screen like a Raspberry Pi touchscreen:** score bug and batter on the left, buttons on the right, tabs in a slim rail on the left edge.
- **Tablet, upright:** bigger buttons and score bug, plus who's on deck and the last few plays.
- **Tablet on its side, or a computer:** two columns, with the score bug, batter, on deck and last plays on the left, large buttons on the right, and tabs in a side rail.

To see every layout at once, open the **screen preview**: https://crossfirebull.github.io/dugout-scorebook/preview.html. It shows ScoreKept on an iPhone, an iPhone on its side, a Raspberry Pi 7" screen, an iPad mini, an iPad, an iPad on its side and a laptop. The preview uses its own practice data, so it never touches your real games.

**Help** (in Settings and Game settings) explains every button, moving runners, league rules, stats and backups.

The speaker button at the top mutes and unmutes. The gear opens **Settings**, grouped into short sections that each open their own screen: **Team** (name, colors, parks & fields), **Games** (new game defaults, sounds & walk-up songs), **Help** (Help and Tutorials) and **Your data** (backup & restore, the welcome setup again). The red X or Done on any of those goes back to Settings. During a game it opens that game's settings, with a link to all settings.

## First launch

The first time ScoreKept opens, tap **Tap to play ball** (iPhones only allow sound after a tap): an aluminum bat pings, the bases on the scorebook light up around the horn while the crowd cheers, and the R·H·E board flips over to add a hit and a run. (With Reduce Motion on, or when you run the setup again, it starts at the finished welcome screen.) Then a short setup walks you through it like the opening screens of a video game: name your team, pick your colors (with a live preview of the score bug and Home Screen icon), choose Dugout or Scorekeeper mode, set your league's innings and tie rule, and add your players. Or tap **Look around with sample data first** to explore a made-up season. Everything you choose can be changed later in **Settings**, and **Run the welcome setup again** is there too.

## Tutorials

Right after the welcome setup, a short **Basics** tour (skippable) spotlights the main parts of the app one at a time, with **Next**, **Back** and **Skip**. More tours live in **Settings → Tutorials** and in **Help**:
- **The basics**: a one-minute look around.
- **Starting a game**: the lineup builder, game details and the coin toss (it opens the real screens as it goes).
- **Scoring a game**: results, where the ball went, runners, the clock, fixing plays, Game settings.
- **Stats and sharing**: tables, charts, recaps, scouting and backups.
- **Sounds and walk-ups**: the organ, walk-up tunes and your own clips.

## Using it at the field

1. Turn on your phone's hotspot and connect the iPad.
2. On the **Team** tab, tap **Edit team** and set your team colors first, then open the link in Safari and tap **Share → Add to Home Screen**. The icon (a scorebook with a lit R·H·E box score in white numbers) is drawn in your team colors at that moment.
3. On the **Team** tab, add your players with their number, up to three positions (main one first) and which side they bat from.
4. On game day, tap **New Game**. It starts with the **lineup**: your players are grouped by position (pitchers, catchers, infield, outfield) on cards with this season's stats, like picking a team in a video game. Tap them in batting order, drag the **☰** handle to move a batter, or tap **Same as last game**. Adding players on the Team tab never sets a lineup; you build it each game. Then **game details**: the opponent, park, league rules, and a pregame checklist for sound, walk-up songs and your last backup. Last comes the **coin toss**: tap **We're visitors** or **We're home** and the game starts. Pick a mode in **Game settings**:
   - **Dugout mode** scores your batters one at a time. The other team's half-inning gets quick **+1 Run** and **+1 Out** buttons, so you can coach and score at the same time.
   - **Scorekeeper mode** scores every batter on both teams.
   **Park & field** (for example "Rolland Moore Park #3") is typed once on Game details, then offered in a dropdown next time. Delete old ones in **Settings → Parks & fields**.
5. After the last inning, tap **Save to season** (or **Play another inning** for extras; the **+** next to the line score adds one any time). A game cut short by a time limit can be ended from Game settings with **End game now**. If your league allows ties, a tie counts as a tie in the record.
6. Saved games add to everyone's stats on the **Stats** tab. Start a fresh season (Spring, Summer or Fall) with **New Season** on the Stats tab; past seasons stay saved, and the season menu switches between them or shows all seasons together. **Stats → Lineups** shows who batted where and played which position in every game.

## Scoring a play

Tap what the batter did. The app moves the runners the usual way, and you can fix anything by tapping a base.

- **Batter reaches:** 1B, 2B, 3B, HR, BB (walk), E (error), and **FC** (fielder's choice: a runner is out, the batter is safe). FC asks which runner was out, or whether everyone was safe, and is grayed out with nobody on base.
- **Batter out:** K swinging, backwards K looking, GO, F, L, P, SF (sac fly), DP, **HR out** (for leagues with a home run limit) and **FBO** (foul ball out).
- **Where it went:** with **Hit location** on, the app asks which fielder made the play or where the hit landed, for spray charts and fielding stats. Every question has **Skip**. For an exact spot, **Tap on the field** opens a full-screen field: tap where the ball went, then **Save**. The nearest fielder still gets the credit, and the spray chart shows the ball exactly there.
- **Moving runners:** tap a runner's base to advance, score or put them out. Right after a play, scoring a runner offers **Scored on the play** (RBI to the batter) or **Scored, no RBI** (error, overthrow, passed ball).
- **Courtesy runner:** also on the runner menu. Once per inning for each team; if they score, the run counts for the courtesy runner.
- **Walk-offs:** the game ends the moment the home team takes the lead in the last inning. Only the winning run counts, unless it's a home run.
- **Undo** takes back the last tap, as many times as you need.

## Changing things mid-game

Nothing is locked once the game starts:
- **Game settings** changes the opponent, date, park, **home or away**, and the league rules any time. Switching home and away mid-game moves each play to the other half of its inning, so every play stays with the team that made it.
- **+ New player** on the lineup screens adds a late fill-in. Leave the name blank and they're "Fill-in" (rename them on the Team tab later; their stats follow).
- **Lineups** subs players in and out once play has started, and **Undo** takes back any tap.
- **Move a ball on a spray chart:** tap any dot on a chart (Stats → Charts or Scout) and drag it to where the ball really went, then **Save**.
- **Fix any play from the Book:** tap a box in the scorebook grid, or a line in the play-by-play (✎), to change the result, what a runner did, who gets the RBI, or delete it. For a ball in play, the field at the top shows where it went: tap it to open the full-screen field and drag the ball (that also sets the fielder). Everything after it is re-scored automatically. Works on saved games too.

## Sharing a game recap

When a game ends, tap **Share recap** on the final banner (or **Stats → Overview → View** on any saved game). It makes:
- **a picture** in your team colors: the final score, win or loss, line score and top performers, sized for phones and Discord;
- **text** formatted for Discord: bold final score, a line score that lines up, top performers and a box score.

**Share picture** and **Share text** open the share sheet (pick Discord, Messages and so on). **Copy text** puts it on the clipboard to paste.

## League rules

Set them for one game in **Game settings**, or as the default for new games in **Settings → New game defaults**. The defaults match our league:

| Rule | Default | What ScoreKept does |
| --- | --- | --- |
| Innings | 7 | |
| Extra innings when tied | 1 | Tied after that, the game is a tie. **Play another inning** adds one anyway. |
| Time limit | 55 min | The clock starts with the first play and counts down under the inning. When time's up it shows **LAST**: the inning being played is the last one. Match the start time to the umpire's watch, or call time by hand, in Game settings. |
| Run rule | 20 after 3, 15 after 4, 10 after 5 | Ends the game after an inning, or the moment the home team gets that far ahead while batting. |
| Home run limit | +2 rule | Over the limit, HR is ruled an out automatically and the HR button warns you first. Also: +1, +3, or 1, 2 or 3 per team (B league: 1 per team). In Dugout mode, tap **+ Their HR** to keep their count. |

Everyone can bat: pick **EH · bats only** in the lineup for anyone who isn't in the field.

## Keeping your data safe

- **Works with no signal.** After you open ScoreKept once with a connection, it keeps a copy of itself on the device and opens and scores with no signal at all. Updates arrive the next time it's online.
- **Saves every tap** on the device as you go, so closing the app, a dead battery or losing signal mid-inning doesn't lose anything. Tap the wrong thing? **Undo**.
- **Protected storage.** ScoreKept asks the device to keep its data out of the browser's automatic cleanup. Using it from the Home Screen icon helps too.
- **Never overwrites a problem.** If saved data ever can't be read, ScoreKept sets it aside and tells you rather than starting over on top of it. If a save ever fails (for example in Private Browsing), a red warning appears.
- **Backups in one tap.** **Stats → Overview → Export & backup → Save backup** opens the share sheet on iPhone and iPad with one file, named like `scorekept-backup-2026-10-30.json`: save it to Files or iCloud Drive, or email it to yourself. A reminder appears when it's been more than a week. **Restore from backup** brings everything back on any device.

## Sounds and walk-up songs

ScoreKept comes with a set of **built-in ballpark organ sounds**: a "Charge!" for home runs, short stings for hits, walks and runs, a strikeout taunt, "shave and a haircut" when the side is retired, a clap-along rally riff, and fanfares for taking the lead, tying it and winning. Each is 1 to 4 seconds long. Any one of them can be swapped for your own clip, and the rest keep working.

### Built-in walk-up tunes

Every player starts with one of 8 original organ walk-ups (Charge Up, Stomp & Clap, Ballpark Boogie, Bring the Heat, Rally Bounce, Big League, Hot Corner Funk, Dugout Swing), 5 to 8 seconds each. Tap **♪ Walk-up** on the Game tab to play the batter's. Pick a different one, or **None**, on the player's page. Choosing your own song file replaces it.

### Adding your own sound or walk-up song (3 steps)

1. **Get the file onto the iPad.** Save it to the **Files** app: download it in Safari (it lands in *Downloads*), AirDrop it from a computer or phone, or put it in iCloud Drive. MP3, M4A and WAV all work.
2. **Pick it in ScoreKept.** For a walk-up song, open the **Team** tab, tap the player, and tap **Choose file** next to Walk-up song. For a game sound, tap the gear, open **Sounds & walk-up songs**, and tap **Choose file** next to that sound.
3. **Trim it.** Set **Start at** to the part you want (the chorus, say) and **Play for** to how many seconds. Tap **▶** to hear it. A whole song can supply a 10-second walk-up without editing the file.

The files stay on the iPad. They aren't uploaded anywhere and aren't in the backup file, so after restoring a backup on a new iPad, pick them again.

### Where to get clips

- **Walk-up songs:** you need a song *file*. Songs streamed from Apple Music or Spotify are locked to those apps, so ScoreKept can't play them. Buy the song as a download from a store that gives you an MP3 (Amazon Music's digital store or Bandcamp, for example) and save it to Files.
- **Organ and crowd sounds:** **GarageBand** on the iPad has a ballpark-style organ and loops you're free to use. Play a riff, export it to Files, and pick it in ScoreKept. Free sound sites work too: **Pixabay** sound effects (no credit needed) and **Freesound** (filter to the *CC0* license).

### How long each clip should be

Sounds play one after another, so long clips push back the next batter's walk-up.

| Sound | Aim for |
| --- | --- |
| Hit, walk, out, strikeout, run scores | 2–4 seconds |
| Rally, take the lead, tie it | 4–6 seconds |
| Home run | 6–10 seconds |
| Walk-up song | 8–12 seconds |
| Win | up to 15 seconds |
| Between innings | 30–60 seconds |

### How sounds are chosen

Sounds play in order, so the next batter's walk-up starts when the previous play's sound ends. The app knows which team is yours and what the score is. Hits and runs play when you bat, strikeouts and outs when you're in the field. Situation sounds cover taking the lead, tying it, a rally when you're tied or behind with a runner in scoring position, a big defensive out, and the win. Add a few **between-innings** songs and one plays after every third out.

## Stats it tracks

- **Standard:** G, PA, AB, R, H, 2B, 3B, HR, RBI, BB, K, AVG, OBP, SLG, OPS
- **Advanced:** wOBA, ISO, BABIP, K%, BB%, BB/K, AVG with runners in scoring position, runs created, reached on error
- **Contact** (batted ball): grounder / line drive / fly ball / pop-up rates, and pull / center / opposite-field rates
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

The checks include simulated seasons: `tests/season-sim.js` plays random five-game seasons and keeps its own stat sheet the way you would on paper, written separately from the app. The test loads those games into ScoreKept and compares every number in the Standard and Advanced batting tables.

## On the list

**Next up**
- Tests for seasons, substitutions, scouting and restoring older backups.
- Refine the Help screen as questions come up at games.

**Planned**
- Polish each screen on its own display: phone, phone on its side, Raspberry Pi, iPad mini, iPad, iPad on its side and laptop.
- Share a game summary (box score and line score) by text or email.
- Choose a layout by hand instead of letting the app pick.
- Your own organ clips to replace the built-in sounds.

**Someday**
- Sync between devices, so a second iPad or a parent's phone sees the same season.
- A baseball / softball switch (baseball would bring back stolen bases).
- Apple Music for walk-up songs (needs an Apple developer account; see the note below).
- An App Store version.
- The Python version (see `python/`), as a separate learning project.

### About Apple Music

Apple has a web toolkit (MusicKit) that would let ScoreKept play songs straight from your Apple Music library, with a start time for each walk-up. It's possible later, with some catches. It needs a paid Apple developer account ($99 a year) to switch on, and it needs a signal at the field because the songs stream. Apple Music's terms also cover personal listening, not playing over a speaker at a public game. Song files you own (above) avoid all three.
