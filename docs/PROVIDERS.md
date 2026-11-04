# Data and hosting options

Checked November 4, 2026. Reconfirm pricing, competition coverage and public display terms before purchase.

## Implemented adapter: football-data.org

The fastest deployment path uses football-data.org and an always-on Render web service with a persistent disk.

football-data.org lists Free w/ Livescores at €12/month, Free + Deep Data at €29/month, and ML Pack Light at €29/month, before applicable taxes. The deep-data option lists lineups/substitutions, scorers, cards and squads; ML Pack Light lists ten seasons of history. They are different packages: confirm the required combination before buying. The free tier lists delayed scores and schedules and does not fulfill a live-score promise.

Source: https://www.football-data.org/pricing

## Alternative: API-Football

API-Football lists Pro at $19/month and 7,500 requests/day, with events, lineups, player statistics and injury endpoints. Validate actual fields and coverage for each league and season. An accessible endpoint does not imply complete data. Switching requires an additional adapter, club identity mapping and live acceptance tests; this provider is not wired in yet.

Source: https://www.api-football.com/pricing

For shot-based xG, pass networks and positional scouting, obtain sample payloads and explicit event coverage confirmation. StatsBomb open data can support a separately labeled historical research area subject to its license and attribution: https://github.com/hudl/open-data

## Hosting recommendation

Render supports persistent disks on paid services; free web services cannot use them. The current smallest paid web compute identifier is `0.5c-512mb` (formerly Starter). Select one instance and mount a disk at `/app/data` for the Docker image. Configure `HOST=0.0.0.0`, `DB_PATH=/app/data/football.sqlite`, and the private `FOOTBALL_API_KEY` as runtime settings. Use `/api/health` for process health and separately monitor freshness.

Sources: https://render.com/docs/compute-plans · https://render.com/docs/disks · https://render.com/pricing

No paid resource is provisioned automatically. Review the compute/disk bill in the host dashboard. Other always-on container hosts with durable volumes can run the same image. Static hosting and request-scoped serverless functions do not run the present continuous worker architecture.
