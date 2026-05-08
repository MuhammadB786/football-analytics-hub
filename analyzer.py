import pandas as pd

df = pd.read_csv("LaLiga_Matches.csv")

# --- BARCELONA ANALYSIS ---
barca_home = df[df["HomeTeam"] == "Barcelona"]
barca_away = df[df["AwayTeam"] == "Barcelona"]

# Total matches
total = len(barca_home) + len(barca_away)
print(f"Total Barcelona matches in dataset: {total}")

# Home wins
home_wins = len(barca_home[barca_home["FTR"] == "H"])
# Away wins
away_wins = len(barca_away[barca_away["FTR"] == "A"])
# Draws
draws = len(barca_home[barca_home["FTR"] == "D"]) + len(barca_away[barca_away["FTR"] == "D"])

print(f"Home wins: {home_wins}")
print(f"Away wins: {away_wins}")
print(f"Draws: {draws}")
print(f"Win rate: {round((home_wins + away_wins) / total * 100, 1)}%")

# --- TOP SCORING TEAMS ---
print("\n--- Top 10 Scoring Home Teams ---")
top_home = df.groupby("HomeTeam")["FTHG"].sum().sort_values(ascending=False).head(10)
print(top_home)

# --- BARCELONA VS REAL MADRID (EL CLASICO) ---
clasico_home = df[(df["HomeTeam"] == "Barcelona") & (df["AwayTeam"] == "Real Madrid")]
clasico_away = df[(df["HomeTeam"] == "Real Madrid") & (df["AwayTeam"] == "Barcelona")]

barca_clasico_wins = len(clasico_home[clasico_home["FTR"] == "H"]) + len(clasico_away[clasico_away["FTR"] == "A"])
real_clasico_wins = len(clasico_home[clasico_home["FTR"] == "A"]) + len(clasico_away[clasico_away["FTR"] == "H"])
clasico_draws = len(clasico_home[clasico_home["FTR"] == "D"]) + len(clasico_away[clasico_away["FTR"] == "D"])

print("\n--- El Clasico Record ---")
print(f"Barcelona wins: {barca_clasico_wins}")
print(f"Real Madrid wins: {real_clasico_wins}")
print(f"Draws: {clasico_draws}")

# --- HIGHEST SCORING SEASONS FOR BARCELONA ---
print("\n--- Barcelona Goals Per Season ---")
barca_all = df[(df["HomeTeam"] == "Barcelona") | (df["AwayTeam"] == "Barcelona")].copy()
barca_all["BarcaGoals"] = barca_all.apply(
    lambda row: row["FTHG"] if row["HomeTeam"] == "Barcelona" else row["FTAG"], axis=1
)
goals_per_season = barca_all.groupby("Season")["BarcaGoals"].sum().sort_values(ascending=False).head(10)
print(goals_per_season)

# --- MOST DOMINANT HOME TEAM (WIN %) ---
print("\n--- Top 10 Teams by Home Win % ---")
home_played = df.groupby("HomeTeam").size()
home_won = df[df["FTR"] == "H"].groupby("HomeTeam").size()
home_win_pct = (home_won / home_played * 100).round(1).sort_values(ascending=False).head(10)
print(home_win_pct)

import matplotlib.pyplot as plt

# --- CHART 1: El Clasico Record ---
clasico_data = ["Barcelona Wins", "Real Madrid Wins", "Draws"]
clasico_values = [barca_clasico_wins, real_clasico_wins, clasico_draws]
colors = ["#A50044", "#FEBE10", "#888888"]

plt.figure(figsize=(8, 5))
plt.bar(clasico_data, clasico_values, color=colors)
plt.title("El Clasico Record (1995-2025)", fontsize=14)
plt.ylabel("Number of Matches")
plt.savefig("clasico_record.png")
plt.show()
print("Chart 1 saved!")

# --- CHART 2: Barcelona Goals Per Season (Top 10) ---
plt.figure(figsize=(12, 6))
goals_per_season.sort_values().plot(kind="barh", color="#A50044")
plt.title("Barcelona Best Scoring Seasons", fontsize=14)
plt.xlabel("Total Goals")
plt.tight_layout()
plt.savefig("barca_goals_per_season.png")
plt.show()
print("Chart 2 saved!")

# --- CHART 3: Top 10 Home Win % ---
plt.figure(figsize=(12, 6))
home_win_pct.sort_values().plot(kind="barh", color="#004D98")
plt.title("Top 10 Teams by Home Win % in La Liga", fontsize=14)
plt.xlabel("Win Percentage")
plt.tight_layout()
plt.savefig("home_win_percentage.png")
plt.show()
print("Chart 3 saved!")