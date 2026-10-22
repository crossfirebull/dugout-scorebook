"""
Lesson 2: classes - keeping all of the game's information in one place.

Goal: a Game object that knows the inning, outs and runs, and changes
sides after three outs.

Run it with:   python3 step2_game_class.py
"""


def ordinal(n):
    """1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th' ..."""
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}" + {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


# A class is a blueprint. Each Game we create from it has its own copy
# of these variables (called attributes), reached through "self".
class Game:
    def __init__(self, away, home, innings=7):
        # __init__ runs once, when the game is created.
        self.teams = [away, home]   # index 0 = away, index 1 = home
        self.innings = innings
        self.inning = 1
        self.half = 0               # 0 = top (away bats), 1 = bottom (home bats)
        self.outs = 0
        self.runs = [[0], []]       # runs per inning for each team
        self.over = False

    # Functions inside a class are called methods.
    def total(self, team):
        return sum(self.runs[team])

    def add_run(self):
        self.runs[self.half][self.inning - 1] += 1
        # Walk-off: home team takes the lead in the last inning (or extras).
        if self.half == 1 and self.inning >= self.innings and self.total(1) > self.total(0):
            self.over = True
            print("   Walk-off! Game over.")

    def add_out(self):
        self.outs += 1
        if self.outs == 3:
            self.end_half()

    def end_half(self):
        side = "top" if self.half == 0 else "bottom"
        print(f"   Three outs. End of the {side} of the {ordinal(self.inning)}.")
        self.outs = 0
        away, home = self.total(0), self.total(1)
        if self.half == 0:
            # Home team leads after the top of the last inning: they don't need to bat.
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

    def status(self):
        if self.over:
            return "Final"
        side = "Top" if self.half == 0 else "Bottom"
        return f"{side} {ordinal(self.inning)}, {self.outs} out"

    def print_line_score(self):
        cols = max(self.innings, self.inning)
        header = "Team".ljust(12) + "".join(f"{i:>3}" for i in range(1, cols + 1)) + "    R"
        print(header)
        print("-" * len(header))
        for team in (0, 1):
            runs = self.runs[team]
            row = self.teams[team][:11].ljust(12)
            row += "".join(f"{runs[i]:>3}" if i < len(runs) else "  ." for i in range(cols))
            row += f"{self.total(team):>5}"
            print(row)


# Create a game and play a few made-up innings.
game = Game("Thunder", "Oak Hollow", innings=3)

game.add_run()                     # Thunder score 1 in the top of the 1st
game.add_out(); game.add_out(); game.add_out()
game.add_run(); game.add_run()     # Oak Hollow score 2
game.add_out(); game.add_out(); game.add_out()

print()
print(game.status())
game.print_line_score()

# Try it yourself: keep calling add_out() until the game ends,
# then print game.status() again. Who won?
