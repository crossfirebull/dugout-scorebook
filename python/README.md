# Learn Python by building a softball scorebook

Five short steps. Each one is a complete program you can run, and each adds one new idea to the step before it. By the end you have a terminal scorebook that tracks the line score and base runners, has undo, and saves the game to a file. That is the same core logic the iPad app uses.

## What you need

- **Python 3.10 or newer.** A Raspberry Pi already has it. On a Mac or PC, install it from python.org.
  - On an iPad, use an app such as *Pythonista* or *a-Shell*. You can also use a browser site such as replit.com.
- **A terminal**, to run each step:

  ```
  cd python
  python3 step1_scoreboard.py
  ```

- **A text editor.** VS Code and Thonny (preinstalled on the Pi) are both good. Read each file top to bottom. The comments explain every new idea.

## Why the iPad app isn't Python

Web browsers, including Safari on the iPad, only run JavaScript. The app (`index.html`) is written in JavaScript so it can run there. But the *thinking* is the same in both languages: the same game object, the same "move the runners" rules, and the same event list for undo. Once you can write the Python version, the JavaScript will look very familiar.

---

## Step 1 — Print a line score
`step1_scoreboard.py`

**New ideas:** variables, lists, `for` loops, functions, f-strings.

A line score is just two lists of numbers, one number per inning. The function loops over the innings and prints each number lined up in a column (`f"{runs[i]:>3}"` right-aligns a number in 3 spaces). `sum(runs)` gives the total.

**Try it:** add a 4th inning to `away_runs`. Then change the call to `innings=5`.

## Step 2 — A `Game` class
`step2_game_class.py`

**New ideas:** classes, `self`, methods, `if`/`else`.

The game needs to keep track of a lot: the inning, top or bottom, outs, and runs for each team. A class bundles all of that into one object. Its methods are the things that can *happen* in a game: `add_run()`, `add_out()`, `end_half()`.

Look closely at `end_half()`. It holds real softball rules:
- After the top of the last inning, if the home team leads, the game is over and they don't bat.
- After the bottom of the last inning, a tie means extra innings.
- `add_run()` checks for a walk-off.

**Try it:** keep calling `add_out()` until `game.over` is `True`.

## Step 3 — Batting order and typing plays
`step3_at_bats.py`

**New ideas:** dictionaries, `while` loops, `input()`, `%` (modulo).

- **Dictionaries:** `OUTS = {"K": "strikes out", ...}` is a lookup table. When you type `GO`, the program looks up what that means.
- **Batting order:** `next_up` counts batters for each team. `% len(lineup)` wraps back to the leadoff hitter after the last batter.
- **The input loop:** the `while` loop keeps asking for the next play until the game ends.

One subtle bug the code avoids: it moves the batting order forward *before* recording the out. The third out switches sides, and we don't want to advance the wrong team's order.

**Try it:** add `"FC": "reaches on a fielder's choice"` to the right dictionary.

## Step 4 — Runners and runs
`step4_runners.py`

**New ideas:** `None`, list indexes as positions, splitting text with `.split()`.

The bases are a list of three spots: `[first, second, third]`. Each spot holds a runner's name, or `None` when it's empty.

- **`advance_all(n)`** moves every runner up `n` bases. It starts with the runner on third, so nobody gets passed. Anyone who passes third scores.
- **`force_advance()`** handles a walk. Only runners who are *pushed* by the batter move. With the bases loaded, the runner on third is forced home.
- **Sac fly:** the run only counts if the catch wasn't the third out.
- **Typing runner moves:** `ADV 1` moves the runner on first up a base, and `OUT 2` puts out the runner on second. `command.split()` turns `"ADV 1"` into `["ADV", "1"]`.

**Try it:** add a `DP` (double play) code. It puts out the runner on first and then the batter.

## Step 5 — Undo and save
`step5_undo_and_save.py`

**New ideas:** importing modules, JSON files, a replay-based undo.

This is the most important idea in the whole project. The game keeps a list of every command typed (`self.events`). From that list:

- **Undo:** remove the last command, reset to the first pitch, and quietly replay everything else. You never have to write "reverse" logic for every kind of play.
- **Save:** write the teams, the lineups and that list to `game.json`. Next time the program starts, it reads the file and replays the game. Close the program in the 4th inning, open it again, and you're still in the 4th.

**Try it:** type a few plays, quit with `Q`, then run the program again.

---

## Where to go next

- **Batting stats.** Keep a dictionary of AB, H, RBI per player, then print a box score at the end.
- **Sounds on a Raspberry Pi.** Install `pygame` (`pip install pygame`) and play a `.wav` file when `HR` is typed.
- **A touchscreen version.** Python's built-in `tkinter` can draw buttons on a Pi touchscreen and call `game.record("1B")` when tapped.
