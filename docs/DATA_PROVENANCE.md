# Historical data provenance and verification

Reviewed November 4, 2026. This is a provenance investigation, not a license grant.

## File identity

- Repository file: `LaLiga_Matches.csv` (11,664 match rows).
- First recorded fixture date: September 2, 1995; last: October 27, 2025.
- SHA-256: `d5d36d0ffff6dc73697e5bf794e19f0546fde07a77fe8caaf20eee60ca6ef2a7`.
- The file entered repository history in commit `7402c24`. The earlier README attributed it to Kaggle without a dataset URL or version.
- One club spelling is normalized from `Villareal` to `Villarreal` at import; original raw bytes remain unchanged.

## Upstream investigation

Candidate: [Kishan's La Liga Complete Dataset](https://www.kaggle.com/datasets/kishan305/la-liga-results-19952020). Its historical subject and dates make it plausible, but an exact byte/row match and a verified version/license could not be established from accessible metadata. Do not present this as the confirmed upstream source.

The column vocabulary agrees with [Football-Data's result-field specification](https://www.football-data.co.uk/notes.txt), including FTHG/FTAG and HTHG/HTAG. That agreement does not prove origin. Football-Data publishes [Spanish results](https://football-data.co.uk/spainm.php) and a [data-use policy](https://football-data.co.uk/contact.php). The latter surfaced in search, but direct retrieval returned HTTP 429 during this review. No new scraping, bulk downloads or commercial clearance is inferred from this investigation.

The repository software license does not grant rights to third-party data, club logos, photographs or the Touchline name. No third-party logos or photographs are required by the demo. Keep the demo clearly labeled as independent and historical. Resolve the original dataset's rights or substitute a documented source before a commercial pilot or redistribution agreement. Do not promise the prospective partner exclusive ownership of the underlying results.

## Independent spot checks

| Assertion checked | Primary reference | Local outcome |
| --- | --- | --- |
| Barcelona 4–3 Real Madrid, May 11, 2025 | [La Liga match record](https://www.laliga.com/partido/temporada-2024-2025-laliga-ea-sports-fc-barcelona-real-madrid-35) | Match agrees |
| Real Madrid 2–1 Barcelona, October 26, 2025 | [Real Madrid match report](https://www.realmadrid.com/en-US/news/football/first-team/reports/cronica-real-madrid-barcelona-jornada-10-liga-26-10-2025) | Match agrees |
| Barcelona scored 110 league goals in 2014–15 | [FC Barcelona season breakdown](https://www.fcbarcelona.es/es/futbol/primer-equipo/noticias/814421/a-un-gol-de-los-400-en-la-era-luis-enrique) | Summed archive total agrees |
| Real Madrid scored 121 goals in 38 league matches in 2011–12 | [Real Madrid historical feature](https://static.realmadrid.com/StaticFiles/RealMadridResponsive/especiales/es/camisetas-y-equipaciones/liga_32.html) | Summed archive total and match count agree |

These selected checks are regression-tested. They do not validate all 11,664 rows or every historical head-to-head aggregate. The 61-match Barcelona/Real Madrid aggregate is calculated from the selected repository records, not independently certified as a complete all-time record.

## Internal diagnostics

No invalid score/date records or duplicate competition/season/home/away fixtures were found after canonical club normalization. Round-robin checks use the observed clubs; an entirely missing club could evade that check. The 2025–26 season is partial. The application exposes these diagnostics and retains scope on exported claims.
