"""
Lesson 1: variables, lists, loops and functions.

Goal: print a softball line score in the terminal.

Run it with:   python3 step1_scoreboard.py
"""

# A variable is a name that holds a value.
away_name = "Thunder"
home_name = "Oak Hollow"

# A list holds several values in order. Here: runs scored in each inning.
# The away team has batted 3 innings, the home team 2 (we're mid-game).
away_runs = [1, 0, 2]
home_runs = [2, 1]


# A function is a reusable block of code. You give it inputs (parameters)
# and it does a job. "innings=7" means: use 7 unless someone says otherwise.
def print_line_score(away_name, away_runs, home_name, home_runs, innings=7):
    # Build the header row: "Team   1  2  3  4  5  6  7    R"
    header = "Team".ljust(12)
    for inning in range(1, innings + 1):     # range(1, 8) gives 1, 2, ... 7
        header += f"{inning:>3}"             # f-string: >3 means right-align in 3 spaces
    header += "    R"
    print(header)
    print("-" * len(header))                 # a line of dashes as wide as the header

    # Loop over both teams with the same code, so we don't write it twice.
    for name, runs in [(away_name, away_runs), (home_name, home_runs)]:
        row = name.ljust(12)
        for i in range(innings):
            if i < len(runs):                # has this inning been played?
                row += f"{runs[i]:>3}"
            else:
                row += "  ."
        row += f"{sum(runs):>5}"             # sum() adds up a list
        print(row)


print_line_score(away_name, away_runs, home_name, home_runs)

# Try it yourself:
#   1. Change away_runs to [1, 0, 2, 4] and run again.
#   2. Call print_line_score(..., innings=5) for a 5-inning game.
