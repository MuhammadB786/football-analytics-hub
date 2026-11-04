# Touchline · Football Analytics Hub

**[Try the free historical demo](https://MuhammadB786.github.io/football-analytics-hub/?view=stories)** · [Three-minute walkthrough](docs/WALKTHROUGH.md) · [Data provenance investigation](docs/DATA_PROVENANCE.md)

The public demo runs entirely in the browser on GitHub Pages. It uses the same analytics and research calculations as the server and includes no credentials or live-provider connection. Build it with `npm run build:demo`; deploy `dist/` as static files. The full server remains available for future live ingestion.

A football intelligence workspace for match research, historical exploration and transparent forecasting. A custom responsive frontend sits on a persistent data service with unattended provider ingestion.

**Development release:** historical features work immediately. Live updates require a private football-data.org key and an always-on host with durable storage. Advanced event/scouting analytics are not connected yet. [Exact delivery status](docs/DELIVERY.md).

## Run

Requires **Node.js 24+**. No npm runtime dependencies.

```sh
git clone https://github.com/MuhammadB786/football-analytics-hub.git
cd football-analytics-hub
npm start
```

Open **http://localhost:3000**. The first start imports **11,664 La Liga results** into SQLite. Coverage: **September 2, 1995–October 27, 2025**, with a partial final season. It is labeled as historical rather than live.

For live updates, copy `.env.example` to `.env`, privately set `FOOTBALL_API_KEY`, restart, then verify a successful ingestion under **Data & reliability**. Subscription restrictions apply; the provider's free plan has delayed scores. Never commit `.env` or expose a key in a browser URL.

## Workspace

The **Research studio** works without a subscription on the bundled archive. Select a club, opponent and period; inspect calculated claims; export landscape/square PNG graphics, a caption and a JSON evidence ledger. Each graphic includes the sample size, date range, source and an evidence fingerprint. A cross-era attack index normalizes club scoring against its available league season. The data reliability view reports invalid records, duplicate fixtures and round-robin count diagnostics. Internal checks do not independently verify every score or establish data publication rights.

| Area                | Implemented behavior                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Overview            | Results-derived standings, recent fixtures, favorites and Elo ratings                              |
| Match center        | Shareable match pages, date-cutoff forecasts, provider goals and lineups where supplied            |
| Historical explorer | Club/opponent/season filters, chart tooltips, shareable queries and CSV export                     |
| Club intelligence   | Win rates, goal difference, season points-per-game trends and recorded history                     |
| Forecast lab        | Poisson score distributions, shrinkage, outcome probabilities, calibration and baseline evaluation |
| Season simulator    | 1,000 seeded simulations, fixture score override, title/top-four/bottom-three rank probabilities   |
| Player leaders      | Provider scoring leaderboard; absent data is explicitly unavailable                                |
| Data & reliability  | Archive boundaries, provider configuration, sync status, freshness and coverage limits             |

Season simulations require remaining scheduled fixtures. The bundled archive has completed results only. Player minutes, shot-based xG, shot maps and passing networks are not inferred from scores.

## Automatic ingestion

The service starts a serialized background loop independently of visitors. It reconciles current La Liga and Premier League fixtures, results, standings and scorers, discovering season rollovers through provider current-season endpoints. Validated match batches commit atomically; provider records supersede corresponding archive fixtures.

Polling targets are **60 seconds near live/pending matches** and **15 minutes otherwise**, plus request duration. Requests are spaced at least 6.5 seconds apart, with timeout and bounded retry/backoff. Failed runs retain existing data. These are design targets, not measured production latency or uptime.

The supported deployment is one process and one durable SQLite volume. An always-running host is required for unattended updates.

## Model evidence

`npm run evaluate` regenerates [reports/evaluation.json](reports/evaluation.json) from the bundled archive.

| Walk-forward metric | Poisson model | Historical-frequency baseline |
| ------------------- | ------------: | ----------------------------: |
| Held-out matches    |           860 |                           860 |
| Log loss ↓          |         0.977 |                         1.074 |
| Multiclass Brier ↓  |         0.581 |                         0.650 |
| Outcome accuracy    |         54.1% |                         44.3% |

Evaluation begins in 2023-24 and ends at the archive boundary. Every prediction excludes results on or after its match date. The baseline uses expanding historical home/draw/away frequencies. This is one retrospective La Liga evaluation, not evidence of future performance or a Premier League evaluation. [Model assumptions](docs/ARCHITECTURE.md).

## Verify and deploy

```sh
npm test
npm run evaluate
node --check public/app.js
```

Tests cover points/goals invariants, probability normalization, atomic rollback, corrected upserts, archive/live deduplication, provider retries, outage persistence, scheduling, seeded simulation, temporal leakage and HTTP behavior. GitHub Actions runs verification and reproducible evaluation.

The [Dockerfile](Dockerfile) uses a non-root runtime and health check. Mount `/app/data` on persistent storage and set the key as a runtime secret. [Operating runbook](docs/OPERATIONS.md) · [Data and hosting options](docs/PROVIDERS.md).

No production host, subscription, incident notifications or backups have been activated. Do not use an ephemeral filesystem or multiple ingestion replicas with this SQLite architecture.

## Source map

```text
src/analytics.js      standings, Elo, Poisson, evaluation, simulations
src/store.js          SQLite schema, validated import and upserts
src/provider.js       adapter, retries, reconciliation, scheduling
src/server.js         HTTP application and worker lifecycle
public/               responsive browser interface
test/                 analytical, ingestion and HTTP checks
reports/evaluation.json  reproducible historical model evaluation
docs/                 architecture, operations and delivery status
```

The obsolete Streamlit app and its screenshots have been removed from the current tree. Earlier versions remain recoverable in Git history.

## Attribution and coverage

Live data: [football-data.org](https://www.football-data.org/). Historical data: this repository's existing Kaggle-sourced La Liga CSV; the precise upstream URL/version and redistribution terms still need documentation. Computed standings do not implement all official tie-breakers or disciplinary deductions. Records are described by actual coverage, without an all-time completeness claim.

**Muhammad Mustafa** · Computer Science, Montclair State University
[GitHub](https://github.com/MuhammadB786) · [LinkedIn](https://linkedin.com/in/muhammad-mustafa)
