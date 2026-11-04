import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { openStore } from "./store.js";
import {
  table,
  predict,
  ratings,
  finished,
  simulateSeason,
} from "./analytics.js";
import { FootballProvider, sync, nextInterval } from "./provider.js";
import { research, audit } from "./research.js";

export function canonicalRows(store) {
  const rows = store.all(),
    liveKeys = new Set(
      rows
        .filter((m) => m.source !== "archive")
        .map((m) => `${m.competition}:${m.season}:${m.home}:${m.away}`),
    );
  return rows.filter(
    (m) =>
      m.source !== "archive" ||
      !liveKeys.has(`${m.competition}:${m.season}:${m.home}:${m.away}`),
  );
}
export function createApp(store) {
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    );
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end();
      }
      if (url.pathname.startsWith("/api/")) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        const all = canonicalRows(store),
          competition = url.searchParams.get("competition") || "PD";
        if (!["PD", "PL"].includes(competition)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Unsupported competition" }));
        }
        const rows = all.filter((m) => m.competition === competition),
          season = url.searchParams.get("season") || rows.at(-1)?.season,
          selected = rows.filter((m) => m.season === season);
        let result;
        if (url.pathname === "/api/overview") {
          const run =
            store.db
              .prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1")
              .get() ?? null;
          const lastSuccess =
            store.db
              .prepare(
                "SELECT finished FROM sync_runs WHERE status='success' ORDER BY id DESC LIMIT 1",
              )
              .get()?.finished ?? null;
          const official = store.db
            .prepare(
              "SELECT payload,updated FROM snapshots WHERE competition=? AND kind='standings'",
            )
            .get(competition);
          const scorers = store.db
            .prepare(
              "SELECT payload,updated FROM snapshots WHERE competition=? AND kind='scorers'",
            )
            .get(competition);
          result = {
            competition,
            season,
            seasons: [...new Set(rows.map((m) => m.season))].sort().reverse(),
            teams: [...new Set(rows.flatMap((m) => [m.home, m.away]))].sort(),
            matches: selected,
            table: table(selected),
            officialTable: official ? JSON.parse(official.payload) : null,
            scorers: scorers ? JSON.parse(scorers.payload) : null,
            ratings: [...ratings(rows)]
              .map(([name, rating]) => ({ name, rating }))
              .sort((a, b) => b.rating - a.rating),
            total: rows.length,
            coverage: {
              first: rows[0]?.date,
              last: rows.at(-1)?.date,
              archive: rows.some((m) => m.source === "archive"),
              live: rows.some((m) => m.source !== "archive"),
              eventData: rows.some((m) => {
                try {
                  return Boolean(JSON.parse(m.payload)?.goals?.length);
                } catch {
                  return false;
                }
              }),
            },
            health: {
              configured: Boolean(
                process.env.FOOTBALL_API_KEY &&
                process.env.FOOTBALL_API_KEY !== "your_key_here",
              ),
              lastSuccess,
              run,
              stale:
                !lastSuccess ||
                Date.now() - Date.parse(lastSuccess) > 20 * 60000,
            },
          };
        } else if (url.pathname === "/api/match") {
          result = rows.find((m) => m.id === url.searchParams.get("id"));
          if (!result) {
            res.writeHead(404);
            return res.end(
              JSON.stringify({ error: "Match not found in this competition" }),
            );
          }
        } else if (url.pathname === "/api/research") {
          try {
            result = research(rows, {
              team: url.searchParams.get("team"),
              opponent: url.searchParams.get("opponent") || "",
              from: url.searchParams.get("from") || "",
              to: url.searchParams.get("to") || "9999",
            });
          } catch (e) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: e.message }));
          }
        } else if (url.pathname === "/api/audit") {
          result = audit(finished(rows));
        } else if (url.pathname === "/api/history") {
          const team = url.searchParams.get("team"),
            opponent = url.searchParams.get("opponent"),
            from = url.searchParams.get("from") || "",
            to = url.searchParams.get("to") || "9999";
          const filtered = finished(rows).filter(
            (m) =>
              (!team || m.home === team || m.away === team) &&
              (!opponent || m.home === opponent || m.away === opponent) &&
              m.season >= from &&
              m.season <= to,
          );
          result = {
            matches: filtered,
            table: table(filtered),
            seasons: [...new Set(filtered.map((m) => m.season))]
              .sort()
              .map((season) => {
                const ms = filtered.filter((m) => m.season === season),
                  t = table(ms).find((t) => t.name === team);
                return {
                  season,
                  matches: ms.length,
                  goals: ms.reduce((s, m) => s + m.hg + m.ag, 0) / ms.length,
                  homeWin: ms.filter((m) => m.hg > m.ag).length / ms.length,
                  team: t ?? null,
                };
              }),
          };
        } else if (url.pathname === "/api/predict") {
          const home = url.searchParams.get("home"),
            away = url.searchParams.get("away"),
            before = url.searchParams.get("before");
          const train = rows.filter(
            (m) => !before || m.date.slice(0, 10) < before.slice(0, 10),
          );
          if (
            !home ||
            !away ||
            home === away ||
            !train.some((m) => m.home === home || m.away === home) ||
            !train.some((m) => m.home === away || m.away === away)
          ) {
            res.writeHead(400);
            return res.end(
              JSON.stringify({
                error: "Choose two different clubs with available history",
              }),
            );
          }
          result = {
            ...predict(train, home, away),
            trainingThrough: finished(train).at(-1)?.date,
            homeTeam: home,
            awayTeam: away,
          };
        } else if (url.pathname === "/api/simulation") {
          let override = null;
          const id = url.searchParams.get("fixture");
          if (id) {
            const hg = Number(url.searchParams.get("hg")),
              ag = Number(url.searchParams.get("ag"));
            if (
              !selected.some(
                (m) => m.id === id && ["SCHEDULED", "TIMED"].includes(m.status),
              ) ||
              ![hg, ag].every((n) => Number.isInteger(n) && n >= 0 && n <= 20)
            ) {
              res.writeHead(400);
              return res.end(
                JSON.stringify({ error: "Invalid simulation scenario" }),
              );
            }
            override = { id, hg, ag };
          }
          const cutoff = selected.at(-1)?.date?.slice(0, 10) || "9999";
          result = simulateSeason(
            rows.filter((m) => m.date.slice(0, 10) <= cutoff),
            selected,
            { override },
          );
        } else if (url.pathname === "/api/evaluation") {
          try {
            result = JSON.parse(
              await readFile(
                new URL("../reports/evaluation.json", import.meta.url),
                "utf8",
              ),
            );
          } catch {
            result = {
              unavailable: true,
              message:
                "Run npm run evaluate and save its JSON output to reports/evaluation.json",
            };
          }
        } else if (url.pathname === "/api/health") {
          const run = store.db
            .prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1")
            .get();
          result = { ok: true, ingestion: run ?? null, matches: all.length };
        } else {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: "Unknown endpoint" }));
        }
        return res.end(JSON.stringify(result));
      }
      const files = {
        "/": "index.html",
        "/app.js": "app.js",
        "/simulation.js": "simulation.js",
        "/studio.js": "studio.js",
        "/stories.js": "stories.js",
        "/audit.js": "audit.js",
        "/studio.css": "studio.css",
        "/style.css": "style.css",
      };
      const name = files[url.pathname];
      if (!name) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.setHeader(
        "Content-Type",
        name.endsWith(".js")
          ? "text/javascript"
          : name.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(await readFile(new URL(`../public/${name}`, import.meta.url)));
    } catch (e) {
      console.error(
        JSON.stringify({ event: "request_failed", message: e.message }),
      );
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Unable to load data. Check service logs." }),
      );
    }
  });
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const store = openStore(),
    server = createApp(store);
  let timer,
    stopping = false;
  const configured =
    process.env.FOOTBALL_API_KEY &&
    process.env.FOOTBALL_API_KEY !== "your_key_here";
  const provider = configured
    ? new FootballProvider(process.env.FOOTBALL_API_KEY)
    : null;
  async function tick() {
    try {
      console.log(
        JSON.stringify({
          event: "sync_complete",
          count: await sync(store, provider),
        }),
      );
    } catch (e) {
      console.error(
        JSON.stringify({ event: "sync_failed", message: e.message }),
      );
    }
    if (!stopping) timer = setTimeout(tick, nextInterval(store.all()));
  }
  server.listen(
    Number(process.env.PORT) || 3000,
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        "Football Intelligence listening on port " + (process.env.PORT || 3000),
      ),
  );
  if (provider && process.env.SYNC_ENABLED !== "0") tick();
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      stopping = true;
      clearTimeout(timer);
      server.close(() => {
        store.db.close();
        process.exit(0);
      });
    });
}
