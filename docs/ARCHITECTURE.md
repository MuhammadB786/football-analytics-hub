# Architecture and operating contract

The v2 application is a Node 24+ service with a custom responsive browser frontend and SQLite persistence. It has no npm runtime dependencies. The old Streamlit entry points have been removed; Git history preserves prior versions.

## Data flow

football-data.org → rate-limited provider adapter → validation → transactional SQLite upserts → canonical archive/live view → HTTP API → browser.

The service imports the bundled 11,664-row CSV once. Historical rows remain immutable; provider rows take precedence for the same competition, season, home club and away club. Provider IDs are namespaced. Known Spanish club identities map to archive names. Newly encountered identity discrepancies must be reviewed before adding alias mappings.

The in-process scheduler starts immediately when a key is configured. It serializes ingestion, waits at least 6.5 seconds between provider requests and retries 429/5xx/network failures up to four attempts. Successful match batches commit atomically. Standings/scorer snapshots are separately timestamped. A run can partially update one competition before another fails; the run remains failed and the interface retains the previous successful-run timestamp. Current-season reconciliation revisits earlier results, discovers fixtures and detects season rollover. There is no historical provider backfill yet.

The nominal interval is 60 seconds around pending/live matches and 15 minutes otherwise, measured after the preceding cycle finishes. This is a polling target, not a provider latency guarantee. One cycle makes six requests. Do not run multiple ingesting replicas against this database; the documented deployment is one persistent process and one persistent volume. For horizontal scale, separate the worker, migrate to Postgres and introduce a distributed ingestion lease and shared cache.

## Product routes

`/?view=overview|matches|history|teams|forecast|simulation|players|status`

Query parameters retain competition, season, team, opponent, historical season range, forecast clubs and match identity. Favorites are browser-local. Filtered archive exports escape CSV formula prefixes. All provider-derived text is HTML-escaped in the frontend. No provider key is returned to the client.

Public GET endpoints: `/api/overview`, `/api/history`, `/api/predict`, `/api/simulation`, `/api/evaluation`, `/api/health`. Mutation and manual ingestion endpoints are deliberately absent. Put a reverse proxy with request limits and TLS ahead of a public instance. A single process and synchronous SQLite suit this scope, not unbounded traffic; the history response can include the complete archive. Add pagination, caching and separate model execution before serving high traffic.

## Analytical semantics

Computed standings use points, goal difference and goals scored, without sanctions or competition-specific head-to-head rules. Official provider standings are separately retained. Historical views cover available records, not all-time football. No xG, shot locations, player minutes, formations or manager histories are inferred from aggregate scorelines. Goals-model expectations are explicitly not shot-based xG.

Elo starts at 1500 with K=20 and home advantage 65. Forecasts use the most recent 1,000 recorded results, attack/defence multipliers shrunk with 12 league-average pseudo-matches, and a fixed 1.12 home factor. Independent Poisson distributions are truncated at 14 goals and outcome probabilities normalized. Parameters are initial modeling choices, not a documented hyperparameter search. Scoreline display omits the tiny truncated tail.

Walk-forward evaluation excludes all same-day results. The baseline uses expanding historical home/draw/away rates. The checked-in evaluation applies only to the bundled La Liga archive through October 27, 2025, with evaluation beginning in 2023-24. It is not a Premier League evaluation or proof of future performance. Run `npm run evaluate` to reproduce it. Season simulation uses fixed strengths, independent Poisson scores, a seeded generator, 1,000 iterations, and simple points/GD/GF rankings. Top-four and bottom-three probabilities describe rank bands, not official qualification or relegation adjudications.

## Missing external capabilities

A real provider key and an always-on deployment with durable storage are required to activate unattended updates. Advanced player scouting, shot maps, passing networks and shot-based xG require an additional appropriately licensed event/player dataset. Outbound incident notifications and remote uptime monitoring must be configured in the chosen host; structured logs and health endpoints are provided, but notifications are not activated. No production availability or recovery-time claims have been established.
