import { createHash } from "node:crypto";
import { finished, table } from "./analytics.js";

export function audit(rows) {
  const keys = new Map(),
    seasons = [];
  let invalid = 0;
  for (const m of rows) {
    const day = m.date.slice(0, 10),
      validDate =
        Number.isFinite(Date.parse(day)) &&
        new Date(day).toISOString().slice(0, 10) === day;
    if (
      !validDate ||
      m.home === m.away ||
      ![m.hg, m.ag].every((n) => Number.isInteger(n) && n >= 0)
    )
      invalid++;
    const key = [m.competition, m.season, m.home, m.away].join("|");
    keys.set(key, (keys.get(key) || 0) + 1);
  }
  for (const season of [...new Set(rows.map((m) => m.season))].sort()) {
    const ms = rows.filter((m) => m.season === season),
      clubs = [...new Set(ms.flatMap((m) => [m.home, m.away]))],
      expected = clubs.length * (clubs.length - 1);
    const unique = new Set(ms.map((m) => `${m.home}|${m.away}`)).size;
    seasons.push({
      season,
      clubs: clubs.length,
      records: ms.length,
      expected,
      missing: Math.max(0, expected - unique),
      complete: unique === expected && ms.length === expected,
    });
  }
  return {
    records: rows.length,
    invalid,
    duplicateFixtures: [...keys]
      .filter(([, n]) => n > 1)
      .map(([key, count]) => ({ key, count })),
    seasons,
    sourceNote:
      "Repository historical CSV; original upstream dataset version and redistribution terms are not yet documented. These checks establish internal consistency, not independent verification of every result.",
  };
}
export function research(
  rows,
  { team, opponent = "", from = "", to = "9999" } = {},
) {
  if (!team || team === opponent)
    throw new Error("Select a club and a different opponent");
  if (from && to && from > to)
    throw new Error("Start season must precede end season");
  const history = finished(rows).sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const matches = history.filter(
    (m) =>
      (m.home === team || m.away === team) &&
      (!opponent || m.home === opponent || m.away === opponent) &&
      m.season >= from &&
      m.season <= to,
  );
  const club = table(matches).find((t) => t.name === team);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        matches.map((m) => [m.id, m.date, m.home, m.away, m.hg, m.ag]),
      ),
    )
    .digest("hex");
  const period = matches.length
    ? `${matches[0].date.slice(0, 10)} to ${matches.at(-1).date.slice(0, 10)}`
    : "No recorded matches";
  const sample = matches.length,
    scope = `${sample} recorded ${rows[0]?.competition === "PL" ? "Premier League" : "La Liga"} matches · ${period}`;
  const facts = club
    ? [
        {
          key: "record",
          title: opponent
            ? `${team} vs ${opponent}`
            : `${team}: the recorded results`,
          headline: `${club.w} wins. ${club.d} draws. ${club.l} defeats.`,
          value: `${club.w}–${club.d}–${club.l}`,
          unit: "WIN / DRAW / LOSS",
          detail: `${team}'s record within the selected coverage.`,
          metrics: [
            ["Played", sample],
            ["Scored", club.gf],
            ["Conceded", club.ga],
          ],
        },
        {
          key: "goals",
          title: `${team}: the goal balance`,
          headline: `${club.gf} scored, ${club.ga} conceded in ${sample} matches.`,
          value: club.gd > 0 ? `+${club.gd}` : String(club.gd),
          unit: "GOAL DIFFERENCE",
          detail: "Full-time goals; no expected-goals data is implied.",
          metrics: [
            ["Goals / game", (club.gf / sample).toFixed(2)],
            ["Win rate", `${((club.w / sample) * 100).toFixed(1)}%`],
            ["Played", sample],
          ],
        },
        {
          key: "wins",
          title: `${team}: results in perspective`,
          headline: `${team} won ${((club.w / sample) * 100).toFixed(1)}% of these ${sample} recorded matches.`,
          value: `${((club.w / sample) * 100).toFixed(1)}%`,
          unit: "RECORDED WIN RATE",
          detail: "Descriptive history, not a forecast of future results.",
          metrics: [
            ["Wins", club.w],
            ["Draws", club.d],
            ["Defeats", club.l],
          ],
        },
      ].map((f) => ({ ...f, scope, period, sample }))
    : [];
  const normalized = [...new Set(history.map((m) => m.season))]
    .filter((s) => s >= from && s <= to)
    .map((season) => {
      const all = history.filter((m) => m.season === season),
        t = table(all).find((t) => t.name === team);
      if (!t) return null;
      const average =
        all.reduce((sum, m) => sum + m.hg + m.ag, 0) / (all.length * 2);
      const clubs = new Set(all.flatMap((m) => [m.home, m.away])).size;
      return {
        season,
        played: t.played,
        goalsPerGame: t.gf / t.played,
        leagueGoalsPerTeamGame: average,
        attackIndex: average ? t.gf / t.played / average : null,
        ppg: t.ppg,
        seasonComplete: all.length === clubs * (clubs - 1),
      };
    })
    .filter(Boolean);
  return {
    team,
    opponent,
    matches,
    facts,
    normalized,
    scope,
    fingerprint,
    quality: audit(matches),
    provenance: {
      sources: [...new Set(matches.map((m) => m.source))],
      calculation:
        "W/D/L and goals calculated from the listed full-time results. Attack index compares club goals per match with all clubs in the same available season; values above 1 mean above league average. It does not adjust for opponent strength.",
      affiliation:
        "Independent prototype. Not affiliated with The Touchline or @TouchlineX.",
    },
  };
}
