"""
Offline demo data for Football Analytics Hub.

The live app reads from football-data.org. Without an API key there is nothing to read,
so this module rebuilds the same payload shapes from `LaLiga_Matches.csv` — 30 seasons of
real La Liga results (1995-96 to 2025-26) that already ship with the repo.

Nothing here is invented: every scoreline comes from the CSV. Where the historical dataset
genuinely cannot answer a question (top scorers, upcoming fixtures — it has no player or
future-fixture data), the functions return None and the UI says so rather than guessing.
"""

from functools import lru_cache

import pandas as pd

CSV_PATH = "LaLiga_Matches.csv"

# CSV short names -> (football-data.org team name, short name, team id)
TEAM_MAP = {
    "Barcelona":    ("FC Barcelona",             "Barça",       81),
    "Real Madrid":  ("Real Madrid CF",           "Real Madrid", 86),
    "Ath Madrid":   ("Club Atlético de Madrid",  "Atleti",      78),
    "Ath Bilbao":   ("Athletic Club Bilbao",     "Athletic",    77),
    "Sevilla":      ("Sevilla FC",               "Sevilla",    559),
    "Valencia":     ("Valencia CF",              "Valencia",    95),
    "Villarreal":   ("Villarreal CF",            "Villarreal",  94),
    "Betis":        ("Real Betis Balompié",      "Betis",       90),
    "Sociedad":     ("Real Sociedad",            "Real Sociedad", 92),
    "Celta":        ("Celta de Vigo",            "Celta",      558),
    "Espanol":      ("Espanyol",                 "Espanyol",    80),
    "Osasuna":      ("CA Osasuna",               "Osasuna",     79),
    "Getafe":       ("Getafe CF",                "Getafe",      84),
    "Mallorca":     ("RCD Mallorca",             "Mallorca",    89),
    "Vallecano":    ("Rayo Vallecano",           "Rayo",        87),
    "Alaves":       ("Deportivo Alavés",         "Alavés",      263),
    "Girona":       ("Girona FC",                "Girona",      298),
    "Levante":      ("Levante UD",               "Levante",     88),
    "Elche":        ("Elche CF",                 "Elche",       285),
    "Oviedo":       ("Real Oviedo",              "Oviedo",      1048),
    "Las Palmas":   ("UD Las Palmas",            "Las Palmas",  275),
    "Valladolid":   ("Real Valladolid CF",       "Valladolid",  250),
    "Cadiz":        ("Cádiz CF",                 "Cádiz",       264),
    "Granada":      ("Granada CF",               "Granada",     83),
    "Almeria":      ("UD Almería",               "Almería",     267),
    "La Coruna":    ("RC Deportivo",             "Deportivo",   560),
    "Zaragoza":     ("Real Zaragoza",            "Zaragoza",    1049),
}

ID_TO_CSV = {v[2]: k for k, v in TEAM_MAP.items()}
COMPETITION = {"name": "Primera División", "code": "PD"}


@lru_cache(maxsize=1)
def _df():
    df = pd.read_csv(CSV_PATH)
    df["ISO"] = pd.to_datetime(df["Date"], format="%d-%m-%Y", errors="coerce")
    return df.dropna(subset=["ISO"]).sort_values("ISO")


def _team(csv_name):
    name, short, tid = TEAM_MAP.get(csv_name, (csv_name, csv_name, 0))
    return {"id": tid, "name": name, "shortName": short}


def _match(row):
    return {
        "utcDate": row.ISO.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "FINISHED",
        "competition": COMPETITION,
        "homeTeam": _team(row.HomeTeam),
        "awayTeam": _team(row.AwayTeam),
        "score": {"fullTime": {"home": int(row.FTHG), "away": int(row.FTAG)}},
    }


def latest_season():
    return _df()["Season"].iloc[-1]


def standings(league_id):
    """Full league table computed from the most recent season in the CSV."""
    if league_id != "PD":
        return None
    df = _df()
    season = latest_season()
    rows = df[df["Season"] == season]

    table = {}
    for r in rows.itertuples():
        for team, gf, ga in ((r.HomeTeam, r.FTHG, r.FTAG), (r.AwayTeam, r.FTAG, r.FTHG)):
            t = table.setdefault(team, dict(playedGames=0, won=0, draw=0, lost=0,
                                            goalsFor=0, goalsAgainst=0))
            t["playedGames"] += 1
            t["goalsFor"] += int(gf)
            t["goalsAgainst"] += int(ga)
            if gf > ga:
                t["won"] += 1
            elif gf == ga:
                t["draw"] += 1
            else:
                t["lost"] += 1

    entries = []
    for team, t in table.items():
        t["points"] = t["won"] * 3 + t["draw"]
        t["goalDifference"] = t["goalsFor"] - t["goalsAgainst"]
        entries.append({"team": _team(team), **t})

    entries.sort(key=lambda e: (-e["points"], -e["goalDifference"], -e["goalsFor"]))
    for i, e in enumerate(entries, 1):
        e["position"] = i

    return {"standings": [{"table": entries}], "season": season}


def matches(league_id, limit=20):
    """Most recent finished results."""
    if league_id != "PD":
        return None
    df = _df()
    rows = df[df["Season"] == latest_season()].tail(limit)
    return {"matches": [_match(r) for r in rows.itertuples()]}


def scorers(league_id):
    """Not derivable — the historical dataset holds no player-level data."""
    return None


def upcoming(league_id):
    """Not derivable — a results archive contains no future fixtures."""
    return None


def team_matches(team_id):
    csv_name = ID_TO_CSV.get(team_id)
    if not csv_name:
        return None
    df = _df()
    rows = df[(df["HomeTeam"] == csv_name) | (df["AwayTeam"] == csv_name)]
    return [_match(r) for r in rows.itertuples()]


def h2h(team1_id, team2_id):
    a, b = ID_TO_CSV.get(team1_id), ID_TO_CSV.get(team2_id)
    if not a or not b:
        return None
    df = _df()
    rows = df[((df["HomeTeam"] == a) & (df["AwayTeam"] == b))
              | ((df["HomeTeam"] == b) & (df["AwayTeam"] == a))]
    return [_match(r) for r in rows.itertuples()]


def covered_team_ids():
    return set(ID_TO_CSV)
