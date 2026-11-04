# Football Analytics Hub

A Streamlit dashboard that puts live league data and 31 seasons of La Liga history in the same
place — standings, results, head-to-head records and per-team deep dives across six European
competitions.

**It runs with no API key.** Clone it, `streamlit run dashboard.py`, and the app falls back to the
bundled dataset of **11,664 real La Liga matches (1995-96 → 2025-26)** and computes everything —
league table, form, head-to-head, team history — from that. Add a free key when you want live data.

![Live league data](assets/dashboard-live.png)

---

## What it does

**Tab 1 — Live League Data**

- Full league table for La Liga, Premier League, Bundesliga, Serie A, Ligue 1 or the Champions League
- Latest results and upcoming fixtures as scorecards
- Top scorers for the selected competition
- **All-time head-to-head** between any two of 58 mapped clubs — wins/draws/losses, a comparison
  bar, and the complete match list. Barcelona vs Real Madrid in the bundled data: **27–14–20 across
  61 league meetings.**

**Tab 2 — Team Deep Dive**

- Seven headline metrics for any club: matches, W/D/L, win rate, goals scored, goal difference
- Goals broken down by competition, filterable
- Match-outcome donut and a sortable recent-match table

![Team deep dive](assets/dashboard-deepdive.png)

## Demo mode

`demo_data.py` rebuilds the exact payload shapes the live API returns, straight from
`LaLiga_Matches.csv`, so every view keeps working offline:

| View                           | Offline source                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Standings                      | League table recomputed from the current season's results — points, GD, ordering, the lot        |
| Recent results                 | Last 20 finished matches                                                                         |
| Head-to-head                   | Every league meeting between the two clubs, 1995-96 onward                                       |
| Team deep dive                 | That club's full match history (1,158 matches for Barcelona)                                     |
| Top scorers, upcoming fixtures | **Disabled, with a message saying why** — a results archive has no player or future-fixture data |

Nothing is fabricated to fill a gap: where the historical dataset genuinely cannot answer, the app
says so rather than inventing a plausible-looking number. Demo mode turns on automatically when no
key is present, or explicitly with `DEMO_MODE=1`.

## Run it

```bash
git clone https://github.com/MuhammadB786/football-analytics-hub.git
cd football-analytics-hub
pip install -r requirements.txt
streamlit run dashboard.py          # demo mode — works immediately
```

For live data, get a free key at [football-data.org](https://www.football-data.org/client/register):

```bash
cp .env.example .env
# then put your key in FOOTBALL_API_KEY
streamlit run dashboard.py
```

The free tier covers the six competitions above and is rate-limited to 10 requests/minute — all API
calls are cached for 5 minutes (`st.cache_data(ttl=300)`) to stay inside it.

## Historical analysis script

`analyzer.py` is a standalone pandas pass over the dataset — Barcelona's all-time record, top
scoring teams, the Clásico ledger, best scoring seasons, and home advantage by club (the league
average home win rate across all 11,664 matches is **47.2%**). It writes three matplotlib charts
into `assets/`:

```bash
python analyzer.py
```

|                                              |                                                                  |                                                        |
| -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| ![Clásico record](assets/clasico_record.png) | ![Barcelona goals per season](assets/barca_goals_per_season.png) | ![Home win percentage](assets/home_win_percentage.png) |

## Tech

|                   |                                                                                |
| ----------------- | ------------------------------------------------------------------------------ |
| **App**           | Streamlit — tabs, columns, metrics, cached data functions, custom dark CSS     |
| **Data**          | pandas for the historical dataset; football-data.org v4 REST API for live data |
| **Charts**        | Plotly (interactive, in-app) and matplotlib (static, for the analysis script)  |
| **Config**        | `python-dotenv`; the key lives in `.env`, which is gitignored                  |
| **Offline layer** | `demo_data.py` — reconstructs API-shaped responses from the CSV                |

## Repo layout

```
dashboard.py           Streamlit app — the main deliverable
demo_data.py           Offline data layer, API-shaped, built from the CSV
analyzer.py            Standalone historical analysis → three charts
LaLiga_Matches.csv     11,664 La Liga results, 1995-96 to 2025-26
assets/                Screenshots and generated charts
.env.example           Config template
```

## Deploy

Free on [Streamlit Community Cloud](https://share.streamlit.io): point it at this repo and
`dashboard.py`. It will run in demo mode out of the box; to serve live data, add
`FOOTBALL_API_KEY = "..."` under **Settings → Secrets**.

## Roadmap

- [ ] xG and shot data (the free API tier has neither)
- [ ] Season-over-season trend view in the deep dive, not just career totals
- [ ] A simple match-outcome model trained on the historical set, scored against held-out seasons
- [ ] Cache the API responses to disk so the app survives rate limiting

## Author

**Muhammad Mustafa** — Computer Science, Montclair State University
[GitHub](https://github.com/MuhammadB786) · [LinkedIn](https://linkedin.com/in/muhammad-mustafa)

Match data © [football-data.org](https://www.football-data.org/). Historical La Liga dataset sourced
from Kaggle.
