# Delivery status

## Historical web release

The current tree replaces the old Streamlit app; previous versions remain in Git history. A subscription-free static build (`npm run build:demo`) uses the same analytical and research core as the server. Three example stories, primary-source spot-check references, a walkthrough and a data provenance investigation are included. Eighteen automated tests pass, including static/server research parity and selected externally corroborated totals. The GitHub Pages workflow builds and publishes `dist/` on main.

Important boundary: the upstream Kaggle dataset version and publication terms remain unverified. The investigation and exact file hash are documented in DATA_PROVENANCE.md; selected official club/league records corroborate only the specific checks listed there. No commercial rights or full-archive independent validation is asserted. The public demo is historical; live updates still require a configured provider and continuously running backend.

Additional subscription-free work: editorial research studio with source-backed historical claims, exact supporting result ledgers and SHA-256 fingerprints; customizable canvas-rendered PNG cards in landscape/square formats; evidence JSON and caption exports; cross-era scoring-environment normalization; visible historical data-quality diagnostics. Sixteen automated tests pass. Browser checks confirmed the research view, square-card dimensions/rendering, PNG generation feedback and mobile layout without page overflow. The browser download-event listener timed out; the exported file was not independently opened on disk during QA.

The basic cross-era scoring index is now implemented; richer opponent-adjusted comparisons remain outstanding.

Implemented: custom responsive frontend; archive explorer with shareable filters and CSV download; match research pages; club trends and favorites; Elo ratings; Poisson match probabilities; chronological evaluation against a baseline; seeded season simulation and score overrides; provider adapter with retries; serialized background reconciliation; SQLite persistence; data freshness/coverage interface; health endpoint; CI; container; operating documentation.

Pending external setup: provider secret, validated live subscription coverage, always-on production host, persistent volume, remote monitoring and backups. No live-data acceptance test has passed without those resources.

Pending deeper product work: licensed player-event ingestion, per-90 scouting and similarity search, shot maps and xG timelines, manager-change analysis, opponent-adjusted form, cross-era normalized comparisons, full-text global search, user accounts/saved server-side research, push notifications, historical provider backfill, production load testing and official competition tie-break/sanction logic.

Resume evidence currently supported: 11,664 imported historical matches; evaluated on 860 temporally held-out La Liga matches; model log loss approximately 0.977 versus 1.074 for an expanding outcome-frequency baseline. Do not claim production uptime, live latency, user scale or richer data coverage until measured after deployment.
