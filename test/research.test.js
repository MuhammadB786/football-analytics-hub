import { test } from "node:test";
import assert from "node:assert/strict";
import { research, audit } from "../src/research.js";
import { openStore } from "../src/store.js";
const match = (id, home, away, hg, ag) => ({
  id,
  home,
  away,
  hg,
  ag,
  date: "2024-01-01",
  season: "2023-24",
  competition: "PD",
  status: "FINISHED",
  source: "test",
});
test("research facts link to exact result evidence and reproducible fingerprint", () => {
  const rows = [
    match("a", "A", "B", 2, 0),
    match("b", "B", "A", 1, 1),
    match("c", "A", "C", 0, 1),
  ];
  const r = research(rows, { team: "A", opponent: "B" });
  assert.equal(r.matches.length, 2);
  assert.equal(r.facts[0].value, "1–1–0");
  assert.equal(r.facts[1].value, "+2");
  assert.equal(
    r.fingerprint,
    research([...rows].reverse(), { team: "A", opponent: "B" }).fingerprint,
  );
  assert.notEqual(
    r.fingerprint,
    research([...rows.slice(1), { ...rows[0], hg: 3 }], {
      team: "A",
      opponent: "B",
    }).fingerprint,
  );
  assert.throws(() => research(rows, { team: "A", opponent: "A" }));
  assert.throws(() =>
    research(rows, { team: "A", from: "2024-25", to: "2023-24" }),
  );
});
test("cross-era normalization uses all league matches, not just selected head-to-head", () => {
  const rows = [
    match("a", "A", "B", 4, 0),
    match("b", "B", "A", 0, 2),
    match("c", "A", "C", 0, 0),
  ];
  const r = research(rows, { team: "A", opponent: "B" });
  assert.equal(r.normalized[0].goalsPerGame, 2);
  assert.equal(r.normalized[0].leagueGoalsPerTeamGame, 1);
  assert.equal(r.normalized[0].attackIndex, 2);
});
test("quality audit detects invalid dates, duplicate fixtures and incomplete seasons", () => {
  const rows = [match("a", "A", "B", 1, 0), match("b", "B", "A", 0, 1)];
  assert.equal(audit(rows).seasons[0].complete, true);
  assert.equal(audit([rows[0]]).seasons[0].complete, false);
  assert.equal(audit([...rows, rows[0]]).duplicateFixtures.length, 1);
  assert.equal(audit([{ ...rows[0], date: "2024-02-30" }]).invalid, 1);
});
test("archive supports a real editorial rivalry claim and has consistent internal scores", () => {
  const store = openStore(":memory:");
  try {
    const rows = store.all();
    const r = research(rows, { team: "Barcelona", opponent: "Real Madrid" });
    assert.equal(r.matches.length, 61);
    assert.equal(r.facts[0].value, "27–14–20");
    const report = audit(rows);
    assert.equal(report.invalid, 0);
    assert.equal(report.duplicateFixtures.length, 0);
    assert.equal(report.seasons.at(-1).complete, false);
  } finally {
    store.db.close();
  }
});
