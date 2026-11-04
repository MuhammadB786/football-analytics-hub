import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore } from "../src/store.js";
import { table, predict, evaluate, simulateSeason } from "../src/analytics.js";
import {
  FootballProvider,
  normalize,
  sync,
  nextInterval,
} from "../src/provider.js";
import { createApp, canonicalRows } from "../src/server.js";
const match = (id, home, away, hg, ag, date = "2025-01-01") => ({
  id,
  home,
  away,
  hg,
  ag,
  date,
  competition: "PD",
  season: "2024-25",
  status: "FINISHED",
  source: "test",
  updated: new Date().toISOString(),
});
test("table balances goals and points, orders tied clubs by goal difference", () => {
  const rows = [
    match("a", "A", "B", 2, 0),
    match("b", "B", "C", 1, 1),
    match("c", "C", "A", 3, 0),
  ];
  const t = table(rows);
  assert.equal(t[0].name, "C");
  assert.equal(
    t.reduce((s, x) => s + x.gf, 0),
    t.reduce((s, x) => s + x.ga, 0),
  );
  assert.equal(
    t.reduce((s, x) => s + x.points, 0),
    8,
  );
  assert.equal(t.find((x) => x.name === "A").played, 2);
});
test("goals probabilities normalize and remain finite for unseen teams", () => {
  const p = predict([], "A", "B");
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-12);
  assert.ok(p.home > p.away);
  assert.throws(() => predict([], "A", "A"));
});
test("archive imports once and invalid batches roll back atomically", () => {
  const s = openStore(":memory:");
  try {
    assert.equal(s.all().length, 11664);
    const before = s.all().length;
    assert.throws(() =>
      s.save([match("new", "A", "B", 1, 0), match("bad", "A", "B", -1, 0)]),
    );
    assert.equal(s.all().length, before);
    s.save([match("new", "A", "B", 1, 0)]);
    s.save([match("new", "A", "B", 2, 0)]);
    assert.equal(s.all().length, before + 1);
    assert.equal(s.all().find((m) => m.id === "new").hg, 2);
  } finally {
    s.db.close();
  }
});
test("provider club identities match historical names", () => {
  const m = normalize(
    {
      id: 1,
      season: { startDate: "2025-08-01" },
      utcDate: "2025-10-27T19:00:00Z",
      homeTeam: { id: 90, name: "Real Betis" },
      awayTeam: { id: 78, name: "Atletico" },
      score: { fullTime: { home: 0, away: 2 } },
      status: "FINISHED",
    },
    "PD",
  );
  assert.equal(m.home, "Betis");
  const s = openStore(":memory:");
  try {
    const before = canonicalRows(s).length;
    s.save([m]);
    assert.equal(canonicalRows(s).length, before);
  } finally {
    s.db.close();
  }
});
test("rate-limit response is retried and respects Retry-After", async () => {
  let calls = 0;
  const waits = [];
  const p = new FootballProvider("secret", {
    spacing: 0,
    sleep: async (ms) => waits.push(ms),
    fetcher: async () =>
      ++calls === 1
        ? new Response("", { status: 429, headers: { "retry-after": "2" } })
        : Response.json({ matches: [] }),
  });
  assert.deepEqual(await p.get("matches"), { matches: [] });
  assert.equal(calls, 2);
  assert.ok(waits.includes(2000));
});
test("failed ingestion records failure and preserves existing results", async () => {
  const s = openStore(":memory:");
  try {
    await assert.rejects(
      sync(s, {
        get: async () => {
          throw new Error("test outage");
        },
      }),
    );
    assert.equal(s.all().length, 11664);
    assert.equal(
      s.db.prepare("SELECT status FROM sync_runs").get().status,
      "failed",
    );
  } finally {
    s.db.close();
  }
});
test("match-aware scheduling speeds up near fixtures", () => {
  const now = Date.now();
  assert.equal(
    nextInterval(
      [{ source: "live", status: "TIMED", date: new Date(now).toISOString() }],
      now,
    ),
    60000,
  );
  assert.equal(nextInterval([]), 900000);
});
test('successful ingestion persists both competitions and corrected provider results', async () => {
  const store=openStore(':memory:');
  let score=1;
  const provider={get:async path=>{
    if(path.endsWith('/matches'))return {matches:[{id:path.includes('/PD/')?9001:9002,season:{startDate:'2026-08-01'},utcDate:'2026-11-01T15:00:00Z',homeTeam:{id:81,name:'FC Barcelona'},awayTeam:{id:86,name:'Real Madrid CF'},score:{fullTime:{home:score,away:0}},status:'FINISHED'}]};
    if(path.endsWith('/standings'))return {standings:[]};
    return {scorers:[]};
  }};
  try {
    assert.equal(await sync(store,provider),2);score=2;assert.equal(await sync(store,provider),2);
    assert.equal(store.all().filter(m=>m.source==='football-data.org').length,2);
    assert.equal(store.all().find(m=>m.id==='fd:9001').hg,2);
    assert.equal(store.db.prepare("SELECT count(*) AS n FROM snapshots").get().n,4);
    assert.equal(store.db.prepare("SELECT status FROM sync_runs ORDER BY id DESC LIMIT 1").get().status,'success');
  }finally{store.db.close();}
});
test('a missing optional endpoint does not prevent the next competition from syncing',async()=>{
  const store=openStore(':memory:');const calls=[];
  try{await assert.rejects(sync(store,{get:async path=>{calls.push(path);if(path.endsWith('/scorers'))throw new Error('subscription');if(path.endsWith('/standings'))return {standings:[]};return {matches:[{id:path.includes('/PD/')?9901:9902,season:{startDate:'2026-08-01'},utcDate:'2026-11-01T15:00:00Z',homeTeam:{id:81,name:'Barcelona'},awayTeam:{id:86,name:'Real Madrid'},score:{fullTime:{home:1,away:0}},status:'FINISHED'}]};}}));assert.ok(calls.includes('competitions/PL/matches'));assert.equal(store.all().filter(m=>m.source==='football-data.org').length,2);}finally{store.db.close();}
});
test("season simulation is reproducible and honors forced results", () => {
  const played = match("a", "A", "B", 1, 0),
    pending = {
      ...match("b", "B", "A", null, null, "2025-02-01"),
      status: "TIMED",
    };
  const options = {
    iterations: 100,
    seed: 42,
    override: { id: "b", hg: 0, ag: 3 },
  };
  const a = simulateSeason([played], [played, pending], options),
    b = simulateSeason([played], [played, pending], options);
  assert.deepEqual(a, b);
  assert.equal(a.teams.find((t) => t.name === "A").title, 1);
  assert.equal(a.teams.find((t) => t.name === "A").points, 6);
  assert.ok(simulateSeason([played], [played]).unavailable);
});
test("walk-forward evaluation excludes later results and all same-day outcomes", () => {
  const train = Array.from({ length: 500 }, (_, i) =>
    match(String(i), "A", "B", i % 3, 1, "2022-01-01"),
  );
  const held = [
    match("x", "A", "B", 1, 0, "2024-01-01"),
    match("y", "B", "A", 0, 2, "2024-01-01"),
  ];
  const result = evaluate([...train, ...held]);
  assert.equal(result.modelMetrics.matches, 2);
  const p = predict(train, "A", "B", { includeRatings: false }),
    p2 = predict(train, "B", "A", { includeRatings: false });
  assert.ok(
    Math.abs(
      result.modelMetrics.logLoss - (-Math.log(p.home) - Math.log(p2.away)) / 2,
    ) < 1e-10,
  );
});
test("API roundtrip filters history, exports proper errors, and applies security headers", async () => {
  const s = openStore(":memory:"),
    server = createApp(s);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + "/api/overview");
    assert.ok(response.headers.get("content-security-policy"));
    const overview = await response.json();
    assert.equal(overview.total, 11664);
    const history = await (
      await fetch(base + "/api/history?team=Barcelona&opponent=Real%20Madrid")
    ).json();
    assert.ok(history.matches.length > 50);
    assert.ok(
      history.matches.every(
        (m) =>
          [m.home, m.away].includes("Barcelona") &&
          [m.home, m.away].includes("Real Madrid"),
      ),
    );
    assert.equal(
      (await fetch(base + "/api/predict?home=A&away=A")).status,
      400,
    );
    assert.equal(
      (await fetch(base + "/api/overview?competition=BAD")).status,
      400,
    );
    assert.equal((await fetch(base + "/no-file")).status, 404);
    assert.equal((await fetch(base + "/", { method: "POST" })).status, 405);
  } finally {
    await new Promise((r) => server.close(r));
    s.db.close();
  }
});
