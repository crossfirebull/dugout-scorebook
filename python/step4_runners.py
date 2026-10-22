"""
Lesson 4: base runners and scoring runs.

Goal: hits and walks move runners, runners who reach home score, and
you can move a runner by hand (steal, advance, thrown out).

New commands:
    ADV 1   runner on first moves up a base (ADV 3 = runner on third scores)
    OUT 2   runner on second is out

Run it with:   python3 step4_runners.py
"""


def ordinal(n):
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}" + {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


HITS = {"1B": 1, "2B": 2, "3B": 3, "HR": 4}          # how many bases each hit is worth
HIT_WORDS = {"1B": "singles", "2B": "doubles", "3B": "triples", "HR": "homers"}
OUTS = {"K": "strikes out", "GO": "grounds out", "FO": "flies out",
        "LO": "lines out", "PO": "pops out"}
FORCED = {"BB": "walks", "HBP": "is hit by a pitch", "E": "reaches on an error"}
BASE_NAMES = ["1st", "2nd", "3rd"]


class Game:
    def __init__(self, away, home, away_lineup, home_lineup, innings=7):
        self.teams = [away, home]
        self.lineups = [away_lineup, home_lineup]
        self.innings = innings
        self.inning = 1
        self.half = 0
        self.outs = 0
        self.runs = [[0], []]
        self.hits = [0, 0]
        self.next_up = [0, 0]
        # Three bases. None means empty, otherwise the runner's name.
        # bases[0] is first, bases[1] second, bases[2] third.
        self.bases = [None, None, None]
        self.over = False

    def say(self, text):
        print("   " + text)

    def current_batter(self):
        lineup = self.lineups[self.half]
        return lineup[self.next_up[self.half] % len(lineup)]

    def total(self, team):
        return sum(self.runs[team])

    # ---------- runs and outs ----------
    def score_run(self, runner):
        self.runs[self.half][self.inning - 1] += 1
        self.say(f"{runner} scores!")
        if self.half == 1 and self.inning >= self.innings and self.total(1) > self.total(0):
            self.over = True
            self.say("Walk-off! Game over.")

    def add_out(self):
        self.outs += 1
        if self.outs == 3:
            self.end_half()

    def end_half(self):
        side = "top" if self.half == 0 else "bottom"
        self.say(f"Three outs. End of the {side} of the {ordinal(self.inning)}.")
        self.outs = 0
        self.bases = [None, None, None]          # runners left on base go back to the dugout
        away, home = self.total(0), self.total(1)
        if self.half == 0:
            if self.inning >= self.innings and home > away:
                self.over = True
                return
            self.half = 1
            self.runs[1].append(0)
        else:
            if self.inning >= self.innings and away != home:
                self.over = True
                return
            self.half = 0
            self.inning += 1
            self.runs[0].append(0)

    # ---------- moving runners ----------
    def advance_all(self, n):
        """Every runner moves up n bases. Start with the lead runner so nobody gets passed."""
        for base in (2, 1, 0):
            runner = self.bases[base]
            if runner is None:
                continue
            self.bases[base] = None
            if base + n >= 3:
                self.score_run(runner)
            else:
                self.bases[base + n] = runner

    def force_advance(self):
        """On a walk, only runners who are pushed by the batter have to move."""
        if self.bases[0] is None:
            return                                  # first base open: nobody is forced
        if self.bases[1] is not None:
            if self.bases[2] is not None:
                self.score_run(self.bases[2])       # bases loaded: runner on third is forced home
            self.bases[2] = self.bases[1]
        self.bases[1] = self.bases[0]
        self.bases[0] = None

    # ---------- one plate appearance ----------
    def play(self, command):
        parts = command.split()                     # "ADV 1" -> ["ADV", "1"]
        if len(parts) == 2 and parts[0] in ("ADV", "OUT") and parts[1] in ("1", "2", "3"):
            return self.move_runner(parts[0], int(parts[1]) - 1)

        code = command
        if code not in HITS and code not in OUTS and code not in FORCED and code != "SF":
            return False
        batter = self.current_batter()
        self.next_up[self.half] += 1

        if code in HITS:
            self.say(f"{batter} {HIT_WORDS[code]}.")
            self.hits[self.half] += 1
            n = HITS[code]
            self.advance_all(n)
            if n == 4:
                self.score_run(batter)
            else:
                self.bases[n - 1] = batter
        elif code in FORCED:
            self.say(f"{batter} {FORCED[code]}.")
            self.force_advance()
            self.bases[0] = batter
        elif code == "SF":
            self.say(f"{batter} hits a sacrifice fly.")
            # The run counts only if the catch wasn't the third out.
            if self.outs < 2 and self.bases[2] is not None:
                runner = self.bases[2]
                self.bases[2] = None
                self.score_run(runner)
            self.add_out()
        else:
            self.say(f"{batter} {OUTS[code]}.")
            self.add_out()
        return True

    def move_runner(self, action, base):
        runner = self.bases[base]
        if runner is None:
            self.say(f"Nobody is on {BASE_NAMES[base]}.")
            return False
        self.bases[base] = None
        if action == "OUT":
            self.say(f"{runner} is out on the bases.")
            self.add_out()
        elif base == 2:
            self.score_run(runner)
        elif self.bases[base + 1] is not None:
            self.bases[base] = runner               # put them back: the next base is taken
            self.say(f"{BASE_NAMES[base + 1]} is occupied. Move that runner first.")
            return False
        else:
            self.bases[base + 1] = runner
            self.say(f"{runner} moves to {BASE_NAMES[base + 1]}.")
        return True

    # ---------- display ----------
    def status(self):
        if self.over:
            return "Final"
        side = "Top" if self.half == 0 else "Bottom"
        return f"{side} {ordinal(self.inning)}, {self.outs} out"

    def runners_text(self):
        on = [f"{BASE_NAMES[b]}: {r}" for b, r in enumerate(self.bases) if r is not None]
        return ", ".join(on) if on else "bases empty"

    def print_line_score(self):
        cols = max(self.innings, self.inning)
        header = "Team".ljust(12) + "".join(f"{i:>3}" for i in range(1, cols + 1)) + "    R  H"
        print(header)
        print("-" * len(header))
        for team in (0, 1):
            runs = self.runs[team]
            row = self.teams[team][:11].ljust(12)
            row += "".join(f"{runs[i]:>3}" if i < len(runs) else "  ." for i in range(cols))
            row += f"{self.total(team):>5}{self.hits[team]:>3}"
            print(row)


HELP = """Batter:  1B 2B 3B HR  BB HBP E   K GO FO LO PO SF
Runner:  ADV 1 / ADV 2 / ADV 3 (scores)   OUT 1 / OUT 2 / OUT 3
Other:   Q to quit"""


def main():
    game = Game("Thunder", "Oak Hollow",
                ["Maya", "Jess", "Tara", "Brooke", "Leah", "Dani", "Sam", "Riley", "Kendra", "Nora"],
                ["Ava", "Paige", "Lexi", "Morgan", "Hannah", "Cora", "Emma", "Jada", "Quinn", "Zoe"])
    print(HELP)
    while not game.over:
        print()
        game.print_line_score()
        print(f"{game.status()} | {game.runners_text()} | Up: {game.current_batter()}")
        try:
            command = input("Play> ").strip().upper()
        except EOFError:
            break
        if command == "Q":
            break
        if not game.play(command):
            print("   Not a play I know. Codes:\n" + HELP)

    print()
    game.print_line_score()
    print(game.status())


if __name__ == "__main__":
    main()
