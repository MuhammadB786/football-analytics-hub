const aliases = {
  81: "Barcelona",
  86: "Real Madrid",
  78: "Ath Madrid",
  77: "Ath Bilbao",
  559: "Sevilla",
  95: "Valencia",
  94: "Villarreal",
  90: "Betis",
  92: "Sociedad",
  558: "Celta",
  80: "Espanol",
  79: "Osasuna",
  Getafe: "Getafe",
  89: "Mallorca",
  87: "Vallecano",
  263: "Alaves",
  298: "Girona",
  88: "Levante",
  285: "Elche",
  1048: "Oviedo",
  275: "Las Palmas",
  250: "Valladolid",
  264: "Cadiz",
  83: "Granada",
  267: "Almeria",
  560: "La Coruna",
  1049: "Zaragoza",
  84: "Getafe",
};
export const teamName = (t) => aliases[t.id] || t.name;
export function normalize(m, competition) {
  if (!m.season?.startDate || !m.homeTeam?.id || !m.awayTeam?.id || !m.id)
    throw new Error("Provider returned incomplete match");
  const year = Number(m.season.startDate.slice(0, 4));
  return {
    id: `fd:${m.id}`,
    competition,
    season: `${year}-${String(year + 1).slice(-2)}`,
    date: m.utcDate,
    home: teamName(m.homeTeam),
    away: teamName(m.awayTeam),
    hg: m.score?.fullTime?.home ?? null,
    ag: m.score?.fullTime?.away ?? null,
    status: m.status,
    source: "football-data.org",
    updated: new Date().toISOString(),
    payload: m,
  };
}
export class FootballProvider {
  constructor(
    key,
    {
      fetcher = fetch,
      sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
      spacing = 6500,
    } = {},
  ) {
    this.key = key;
    this.fetcher = fetcher;
    this.sleep = sleep;
    this.spacing = spacing;
    this.last = 0;
  }
  async get(path) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.sleep(Math.max(0, this.spacing - (Date.now() - this.last)));
      this.last = Date.now();
      let response;
      try {
        response = await this.fetcher(
          `https://api.football-data.org/v4/${path}`,
          {
            headers: {
              "X-Auth-Token": this.key,
              "X-Unfold-Goals": "true",
              "X-Unfold-Lineups": "true",
              "X-Unfold-Bookings": "true",
              "X-Unfold-Subs": "true",
            },
            signal: AbortSignal.timeout(20000),
          },
        );
      } catch (e) {
        if (attempt === 3)
          throw new Error("Provider request failed after retries");
        await this.sleep(1000 * 2 ** attempt);
        continue;
      }
      if (response.ok) return response.json();
      if (response.status !== 429 && response.status < 500)
        throw new Error(
          `Provider HTTP ${response.status}; check subscription and competition access`,
        );
      if (attempt === 3)
        throw new Error(`Provider HTTP ${response.status} after retries`);
      const retry = response.headers.get("retry-after");
      const delay =
        Number(retry) ||
        Math.max(0, (Date.parse(retry) - Date.now()) / 1000) ||
        2 ** attempt;
      await this.sleep(Math.min(120000, Math.max(1000, delay * 1000)));
    }
  }
}
export async function sync(store, provider) {
  const started = new Date().toISOString();
  const run = store.db
    .prepare("INSERT INTO sync_runs(started,status,count) VALUES(?,?,0)")
    .run(started, "running");
  let count = 0;
  try {
    const errors = [];
    for (const competition of ["PD", "PL"]) {
      try {
        // The current-season endpoint discovers season rollovers and revisits all results for corrections.
        const payload = await provider.get(
          `competitions/${competition}/matches`,
        );
        if (!Array.isArray(payload.matches) || payload.matches.length === 0)
          throw new Error(`Empty or invalid ${competition} fixture response`);
        const matches = payload.matches.map((m) => normalize(m, competition));
        store.save(matches);
        count += matches.length;
        for (const kind of ["standings", "scorers"]) {
          try {
            const data = await provider.get(
              `competitions/${competition}/${kind}`,
            );
            if (!Array.isArray(data[kind]))
              throw new Error(`Invalid ${kind} response`);
            store.db
              .prepare(
                "INSERT INTO snapshots VALUES(?,?,?,?) ON CONFLICT(competition,kind) DO UPDATE SET payload=excluded.payload,updated=excluded.updated",
              )
              .run(
                competition,
                kind,
                JSON.stringify(data),
                new Date().toISOString(),
              );
          } catch (error) {
            errors.push(`${competition}/${kind}: ${error.message}`);
          }
        }
      } catch (error) {
        errors.push(`${competition}/matches: ${error.message}`);
      }
    }
    if (errors.length) throw new Error(errors.join("; "));
    store.db
      .prepare("UPDATE sync_runs SET finished=?,status=?,count=? WHERE id=?")
      .run(new Date().toISOString(), "success", count, run.lastInsertRowid);
    return count;
  } catch (e) {
    store.db
      .prepare(
        "UPDATE sync_runs SET finished=?,status=?,count=?,error=? WHERE id=?",
      )
      .run(
        new Date().toISOString(),
        "failed",
        count,
        e.message,
        run.lastInsertRowid,
      );
    throw e;
  }
}
export function nextInterval(rows, now = Date.now()) {
  return rows.some(
    (m) =>
      m.source !== "archive" &&
      (["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
        m.status,
      ) ||
        (m.status !== "FINISHED" &&
          Math.abs(Date.parse(m.date) - now) < 3 * 3600000)),
  )
    ? 60000
    : 15 * 60000;
}
