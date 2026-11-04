# Runbook

## Local startup

Install Node 24 or newer, then run `npm start`. Open http://localhost:3000. No package installation is required. `npm test` verifies ingestion, calculations and the HTTP application. `npm run evaluate` regenerates `reports/evaluation.json`.

Copy `.env.example` to `.env` and set `FOOTBALL_API_KEY` privately. Do not paste it into a chat, commit it or put it into a URL. Restart the service. The status view must report a successful ingestion before live coverage is considered active. Verify both La Liga and Premier League data. Subscription coverage and provider delays remain external constraints.

## Container deployment

Build: `docker build -t football-intelligence .`

Run with a persistent volume and a private environment file:

```sh
docker volume create football-data
docker run -d --name football-intelligence --restart unless-stopped -p 3000:3000 --env-file .env -v football-data:/app/data football-intelligence
```

The container listens on all interfaces; terminate TLS at the hosting platform or reverse proxy. Never expose an API credential as a build argument. Use one instance. Configure host-level resource limits, uptime checks and incident notifications. A sleeping/free web host cannot provide continuous ingestion.

## Health and alerting

`/api/health` reports process health, latest ingestion and canonical record count. An HTTP 200 means the application is responding, not that the provider is fresh. Alert separately on a failed run or a successful-ingestion age above 20 minutes. With no key configured, the historical application is expected to remain usable with live freshness unverified. Logs are structured JSON for sync success, sync failure and failed requests. Logs must not include tokens.

## Backup and restore

Run `npm run backup` to create a consistent SQLite online backup under `data/backups/`. Copy it to encrypted storage outside the service volume and configure that copy on your host's daily schedule. Copying only the main database file while WAL writes are active can lose data. Test restore into a separate instance and verify match counts, latest run, representative fixture scores and archive/live deduplication. The service can rebuild the bundled archive automatically; live history cannot be reconstructed without retained records or provider historical access.

## Failures

- 401/403: inspect key validity and subscribed competition access. Set the secret in host settings; restart without logging it.
- 429: examine duplicate workers and provider quota. The adapter already spaces calls and honors bounded Retry-After delays.
- Stale data: check worker logs, process uptime, latest successful run, volume permissions and external provider status. Do not relabel cached scores as live.
- Incorrect result: provider records are reconciled on the next cycle. Inspect canonical club mapping if a duplicate archive fixture appears.
- Deployment regression: roll back to the preceding image with the same mounted volume. Back up before schema-changing deployments. Current schema uses additive creation and is not a general migration framework.

## Release gate

Before a public launch: run tests, inspect desktop/mobile interfaces, verify provider access with real live and completed fixtures, test a forced provider outage, validate the durable volume across restart, configure monitoring and backup, and confirm data display/redistribution rights. CI checks code and model reproducibility; it does not substitute for live-provider acceptance testing.
