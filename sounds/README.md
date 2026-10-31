# Intro sounds

The first-launch intro plays these two files when you tap **Tap to play ball**:

| File | What it is | Plays |
| --- | --- | --- |
| `intro-bat.mp3` | An aluminum bat hitting a softball | Right on the tap |
| `intro-cheer.mp3` | A short crowd cheer, about 3 seconds | Just after the hit |

Swap either one for another recording with the same name. Keep each under about 5 seconds and 200 KB, and only use sounds you're allowed to share: CC0 / public domain, or the Pixabay Content License. If a file is missing, the intro still runs, just silently.

## Where these came from

- `intro-cheer.mp3`: "Baseball Home Run" by ballparkfanatic444 on Pixabay (Pixabay Content License), trimmed to the first big cheer with a fade out.
- `intro-bat.mp3`: made for ScoreKept (a synthesized aluminum-bat hit: the crack, the thwock of the ball, the ring of the barrel, and a slap-back echo off the stands).

## Sound library

`index.html` here is the sound library page (crossfirebull.github.io/dugout-scorebook/sounds/): the two intro sounds plus every built-in game sound, situation sound and walk-up tune, recorded to `library/*.mp3`. The app makes those sounds live with its organ engine; `tools/render-sounds.js` records them (serve the repo on port 8777 first; it needs Playwright and ffmpeg) and writes `library/list.json`, which the page reads.
