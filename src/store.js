import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export function openStore(
  path = process.env.DB_PATH || "data/football.sqlite",
) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,competition TEXT NOT NULL,season TEXT NOT NULL,date TEXT NOT NULL,home TEXT NOT NULL,away TEXT NOT NULL,hg INTEGER,ag INTEGER,status TEXT NOT NULL,source TEXT NOT NULL,updated TEXT NOT NULL,payload TEXT);
  CREATE INDEX IF NOT EXISTS match_scope ON matches(competition,season,date);
  CREATE TABLE IF NOT EXISTS sync_runs(id INTEGER PRIMARY KEY,started TEXT,finished TEXT,status TEXT,count INTEGER,error TEXT);
  CREATE TABLE IF NOT EXISTS snapshots(competition TEXT,kind TEXT,payload TEXT,updated TEXT,PRIMARY KEY(competition,kind));`);
  const upsert = db.prepare(
    `INSERT INTO matches VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET season=excluded.season,date=excluded.date,home=excluded.home,away=excluded.away,hg=excluded.hg,ag=excluded.ag,status=excluded.status,updated=excluded.updated,payload=excluded.payload`,
  );
  function save(matches) {
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const m of matches) {
        validate(m);
        upsert.run(
          m.id,
          m.competition,
          m.season,
          m.date,
          m.home,
          m.away,
          m.hg,
          m.ag,
          m.status,
          m.source,
          m.updated,
          JSON.stringify(m.payload ?? null),
        );
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  if (
    !db.prepare("SELECT id FROM matches WHERE source='archive' LIMIT 1").get()
  ) {
    const lines = readFileSync(
      new URL("../LaLiga_Matches.csv", import.meta.url),
      "utf8",
    )
      .trim()
      .split(/\r?\n/)
      .slice(1);
    const rows = lines.map((line) => {
      const [season, date, home, away, hg, ag] = line.split(",");
      const [d, mo, y] = date.split("-");
      const day = `${y}-${mo}-${d}`;
      return {
        id: `archive:${day}:${home}:${away}`,
        competition: "PD",
        season,
        date: day,
        home,
        away,
        hg: Number(hg),
        ag: Number(ag),
        status: "FINISHED",
        source: "archive",
        updated: new Date().toISOString(),
      };
    });
    save(rows);
  }
  // One legacy spelling in the archive refers to the same club, not a distinct identity.
  db.prepare(
    "UPDATE matches SET home='Villarreal' WHERE home='Villareal'",
  ).run();
  db.prepare(
    "UPDATE matches SET away='Villarreal' WHERE away='Villareal'",
  ).run();
  return {
    db,
    save,
    all: () => db.prepare("SELECT * FROM matches ORDER BY date,id").all(),
  };
}
export function validate(m) {
  if (
    !m.id ||
    !["PD", "PL"].includes(m.competition) ||
    !m.season ||
    !m.home ||
    !m.away ||
    m.home === m.away ||
    !/^\d{4}-\d{2}-\d{2}/.test(m.date) ||
    !Number.isFinite(Date.parse(m.date))
  )
    throw new Error("Invalid match identity");
  for (const score of [m.hg, m.ag])
    if (score !== null && (!Number.isInteger(score) || score < 0))
      throw new Error("Invalid score");
  if (m.status === "FINISHED" && (m.hg === null || m.ag === null))
    throw new Error("Finished match missing score");
}
