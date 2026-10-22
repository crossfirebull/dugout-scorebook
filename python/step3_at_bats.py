"""
Lesson 3: a lineup and an input loop.

Goal: type what each batter did (1B, K, GO...) and let the program keep
track of whose turn it is. Runners come in lesson 4. For now a hit just
gets counted.

Run it with:   python3 step3_at_bats.py
"""


def ordinal(n):
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}" + {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


# A dictionary maps a key to a value, like a lookup table.
# Typing "GO" should look up "grounds out".
OUTS = {"K": "strikes out", "GO": "grounds out", "FO": "flies out",
        "LO": "lines out", "PO": "pops out"}
SAFE = {"1B": "singles", "2B": "doubles", "3B": "triples", "HR": "homers",
        "BB": "walks", "HBP": "is hit by a pitch", "E": "reaches on an error"}


class Game:
    def __init__(self, away, home, away_lineup, home_lineup, innings=7):
        self.teams = [away, home]
        self.lineups = [away_lineup, home_lineup]
        self.innings = innings
        self.inning = 1
        self.half = 0
        self.outs = 0
        self.runs = [[0], []]
        self.next_up = [0, 0]       # position in the batting order, for each team
        self.over = False

    def current_batter(self):
        lineup = self.lineups[self.half]
        # % (modulo) wraps around: after the last batter comes the first again.
        return lineup[self.next_up[self.half] % len(lineup)]

    def total(self, team):
        return sum(self.runs[team])

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

    def play(self, code):
        """Record one plate appearance. Returns False if the code is unknown."""
        if code not in OUTS and code not in SAFE:
            return False
        batter = self.current_batter()
        self.next_up[self.half] += 1          # move the order along BEFORE a possible side change
        if code in OUTS:
            print(f"   {batter} {OUTS[code]}.")
            self.add_out()
        else:
            print(f"   {batter} {SAFE[code]}.")
        return True

    def status(self):
        if self.over:
            return "Final"
        side = "Top" if self.half == 0 else "Bottom"
        return f"{side} {ordinal(self.inning)}, {self.outs} out"


def main():
    game = Game("Thunder", "Oak Hollow",
                ["Maya", "Jess", "Tara", "Brooke", "Leah", "Dani", "Sam", "Riley", "Kendra", "Nora"],
                ["Ava", "Paige", "Lexi", "Morgan", "Hannah", "Cora", "Emma", "Jada", "Quinn", "Zoe"])
    print("Codes: 1B 2B 3B HR BB HBP E | K GO FO LO PO | Q to quit")

    # "while" repeats until the condition becomes False.
    while not game.over:
        team = game.teams[game.half]
        print(f"\n{game.status()} | {team} batting | Up: {game.current_batter()}")
        try:
            code = input("Play> ").strip().upper()   # strip spaces, make it uppercase
        except EOFError:                             # input ran out (Ctrl-D)
            break
        if code == "Q":
            break
        if not game.play(code):
            print("   I don't know that one. Try 1B, K, GO ...")

    print(f"\n{game.teams[0]} {game.total(0)}, {game.teams[1]} {game.total(1)}  ({game.status()})")


# This line means "only run main() when this file is run directly",
# not when another file imports it. You'll see it in most Python programs.
if __name__ == "__main__":
    main()
