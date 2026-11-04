export const finished = (rows) =>
  rows.filter(
    (m) =>
      m.status === "FINISHED" &&
      Number.isInteger(m.hg) &&
      Number.isInteger(m.ag),
  );
export function table(rows) {
  const teams = new Map();
  for (const m of finished(rows))
    for (const [name, gf, ga] of [
      [m.home, m.hg, m.ag],
      [m.away, m.ag, m.hg],
    ]) {
      const t = teams.get(name) || {
        name,
        played: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        points: 0,
        form: [],
      };
      t.played++;
      t.gf += gf;
      t.ga += ga;
      const result = gf > ga ? "W" : gf === ga ? "D" : "L";
      t[result.toLowerCase()]++;
      t.points += result === "W" ? 3 : result === "D" ? 1 : 0;
      t.form.push(result);
      teams.set(name, t);
    }
  return [...teams.values()]
    .map((t) => ({
      ...t,
      gd: t.gf - t.ga,
      ppg: t.points / t.played,
      form: t.form.slice(-5),
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name),
    );
}
export function ratings(rows) {
  const r = new Map();
  for (const m of finished(rows).sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )) {
    const h = r.get(m.home) ?? 1500,
      a = r.get(m.away) ?? 1500;
    const expected = 1 / (1 + 10 ** ((a - h - 65) / 400)),
      actual = m.hg > m.ag ? 1 : m.hg === m.ag ? 0.5 : 0;
    const delta = 20 * (actual - expected);
    r.set(m.home, h + delta);
    r.set(m.away, a - delta);
  }
  return r;
}
function poisson(lambda) {
  const p = [Math.exp(-lambda)];
  for (let i = 1; i <= 14; i++) p.push((p[i - 1] * lambda) / i);
  return p;
}
export function predict(rows, home, away, { includeRatings = true } = {}) {
  if (home === away) throw new Error("Choose two different clubs");
  const history = finished(rows),
    recent = history.slice(-1000),
    ts = table(recent),
    hm = ts.find((t) => t.name === home),
    am = ts.find((t) => t.name === away);
  const avg = recent.length
    ? recent.reduce((s, m) => s + m.hg + m.ag, 0) / recent.length / 2
    : 1.3;
  // Shrink small samples toward the league mean; this is a goals model, not shot-based xG.
  const attack = (t) =>
    ((t?.gf ?? 0) + avg * 12) / ((t?.played ?? 0) + 12) / avg;
  const defense = (t) =>
    ((t?.ga ?? 0) + avg * 12) / ((t?.played ?? 0) + 12) / avg;
  const lh = Math.min(5, Math.max(0.15, avg * attack(hm) * defense(am) * 1.12));
  const la = Math.min(
    5,
    Math.max(0.15, (avg * attack(am) * defense(hm)) / 1.12),
  );
  const hp = poisson(lh),
    ap = poisson(la);
  let win = 0,
    draw = 0,
    loss = 0,
    total = 0;
  const scores = [];
  for (let h = 0; h < hp.length; h++)
    for (let a = 0; a < ap.length; a++) {
      const p = hp[h] * ap[a];
      total += p;
      if (h > a) win += p;
      else if (h === a) draw += p;
      else loss += p;
      scores.push({ home: h, away: a, p });
    }
  const elo = includeRatings ? ratings(history) : new Map();
  return {
    home: win / total,
    draw: draw / total,
    away: loss / total,
    homeGoals: lh,
    awayGoals: la,
    scores: scores.sort((a, b) => b.p - a.p).slice(0, 5),
    homeElo: elo.get(home) ?? 1500,
    awayElo: elo.get(away) ?? 1500,
    sample: recent.length,
    version: "poisson-shrinkage-v1",
  };
}
export function evaluate(rows, startSeason = "2023-24") {
  const sorted = finished(rows).sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const train = [],
    predictions = [];
  // Same-day matches share the same training cutoff: no ordering leakage within a day.
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j < sorted.length && sorted[j].date === sorted[i].date) j++;
    for (const m of sorted.slice(i, j))
      if (m.season >= startSeason && train.length >= 500) {
        const p = predict(train, m.home, m.away, { includeRatings: false }),
          actual = m.hg > m.ag ? 0 : m.hg === m.ag ? 1 : 2,
          probs = [p.home, p.draw, p.away];
        const counts = [0, 0, 0];
        for (const x of train)
          counts[x.hg > x.ag ? 0 : x.hg === x.ag ? 1 : 2]++;
        const baseline = counts.map((c) => c / train.length);
        predictions.push({ date: m.date, actual, probs, baseline });
      }
    train.push(...sorted.slice(i, j));
    i = j;
  }
  const metrics = (key) => {
    const n = predictions.length;
    if (!n) return null;
    return {
      matches: n,
      logLoss:
        predictions.reduce(
          (s, p) => s - Math.log(Math.max(1e-12, p[key][p.actual])),
          0,
        ) / n,
      brier:
        predictions.reduce(
          (s, p) =>
            s +
            p[key].reduce(
              (v, q, i) => v + (q - (i === p.actual ? 1 : 0)) ** 2,
              0,
            ),
          0,
        ) / n,
      accuracy:
        predictions.filter(
          (p) => p[key].indexOf(Math.max(...p[key])) === p.actual,
        ).length / n,
    };
  };
  const calibration = Array.from({ length: 10 }, (_, i) => {
    const values = predictions
      .flatMap((p) => p.probs.map((q, j) => ({ q, y: j === p.actual ? 1 : 0 })))
      .filter((x) => x.q >= i / 10 && x.q < (i + 1) / 10);
    return {
      bin: `${i * 10}–${(i + 1) * 10}%`,
      count: values.length,
      predicted: values.length
        ? values.reduce((s, x) => s + x.q, 0) / values.length
        : null,
      observed: values.length
        ? values.reduce((s, x) => s + x.y, 0) / values.length
        : null,
    };
  });
  return {
    model: "poisson-shrinkage-v1",
    startSeason,
    cutoff: "Strictly prior match dates",
    modelMetrics: metrics("probs"),
    baselineMetrics: metrics("baseline"),
    calibration,
  };
}

export function simulateSeason(
  history,
  fixtures,
  { iterations = 1000, seed = 42, override = null } = {},
) {
  const pending = fixtures.filter((m) =>
    ["SCHEDULED", "TIMED"].includes(m.status),
  );
  if (!pending.length)
    return {
      unavailable: true,
      message:
        "No remaining scheduled fixtures in the selected season. Connect a provider for season simulations.",
    };
  const base = table(fixtures),
    names = [...new Set(fixtures.flatMap((m) => [m.home, m.away]))].sort();
  const predictions = pending.map((m) => ({
    m,
    p: predict(history, m.home, m.away, { includeRatings: false }),
  }));
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const sample = (lambda) => {
    let p = 1,
      k = 0;
    const l = Math.exp(-lambda);
    do {
      k++;
      p *= random();
    } while (p > l);
    return k - 1;
  };
  const totals = new Map(
    names.map((name) => [
      name,
      { name, title: 0, top4: 0, bottom3: 0, points: 0, position: 0 },
    ]),
  );
  for (let i = 0; i < iterations; i++) {
    const t = new Map(
      names.map((name) => [
        name,
        { name, points: 0, gd: 0, gf: 0, ...base.find((x) => x.name === name) },
      ]),
    );
    for (const { m, p } of predictions) {
      const forced = override?.id === m.id;
      const hg = forced ? override.hg : sample(p.homeGoals),
        ag = forced ? override.ag : sample(p.awayGoals),
        h = t.get(m.home),
        a = t.get(m.away);
      h.gf += hg;
      a.gf += ag;
      h.gd += hg - ag;
      a.gd += ag - hg;
      h.points += hg > ag ? 3 : hg === ag ? 1 : 0;
      a.points += ag > hg ? 3 : hg === ag ? 1 : 0;
    }
    const sorted = [...t.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name),
    );
    sorted.forEach((t, j) => {
      const total = totals.get(t.name);
      total.points += t.points;
      total.position += j + 1;
      if (j === 0) total.title++;
      if (j < 4) total.top4++;
      if (j >= names.length - 3) total.bottom3++;
    });
  }
  return {
    iterations,
    seed,
    remaining: pending.length,
    override,
    assumptions:
      "Independent Poisson goals; fixed team strengths; points/GD/GF tie-breaks; top-four and bottom-three are rank bands, not official qualification rules.",
    teams: [...totals.values()]
      .map((t) => ({
        ...t,
        title: t.title / iterations,
        top4: t.top4 / iterations,
        bottom3: t.bottom3 / iterations,
        points: t.points / iterations,
        position: t.position / iterations,
      }))
      .sort((a, b) => a.position - b.position),
  };
}
