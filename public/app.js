import { auditPanel } from "./audit.js";
import { simulationView } from "./simulation.js";
import { studioView, bindStudio } from "./studio.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const params = new URLSearchParams(location.search);
let view = params.get("view") || "overview",
  data,
  request = 0;
const pct = (n) => `${(n * 100).toFixed(1)}%`,
  num = (n) =>
    Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 }),
  date = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : "Unavailable";
let favorites;
try {
  favorites = JSON.parse(localStorage.getItem("touchline-favorites") || "[]");
  if (!Array.isArray(favorites)) favorites = [];
} catch {
  favorites = [];
}
if (params.has("competition"))
  $("#competition").value = params.get("competition");
function url(path, extra = {}) {
  const q = new URLSearchParams({
    competition: $("#competition").value,
    season: $("#season").value,
    ...extra,
  });
  return `/api/${path}?${q}`;
}
async function api(path, extra = {}) {
  const res = await fetch(url(path, extra));
  const value = await res.json();
  if (!res.ok) throw new Error(value.error || "Request failed");
  return value;
}
function persist(extra = {}) {
  const q = new URLSearchParams(location.search);
  q.set("view", view);
  q.set("competition", $("#competition").value);
  q.set("season", $("#season").value);
  for (const [k, v] of Object.entries(extra)) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  history.replaceState(null, "", `?${q}`);
}
const title = (eyebrow, name, sub) =>
  `<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${name}</h1><p class="sub">${sub}</p></div><span class="pill">${esc(data.season || "NO COVERAGE")} · ${data.competition === "PD" ? "LA LIGA" : "PREMIER LEAGUE"}</span></div>`;
const metric = (label, value, caption) =>
  `<div class="metric"><label>${label}</label><div class="value">${value}</div><div class="caption">${caption}</div></div>`;
const empty = (heading, message) =>
  `<div class="empty"><h2>${heading}</h2><p>${message}</p></div>`;
const panel = (heading, sub, body) =>
  `<section class="panel"><div class="panel-head"><div><h2>${heading}</h2><p class="sub">${sub}</p></div></div>${body}</section>`;
function table(rows, limit = 100) {
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th><th>Last 5</th></tr></thead><tbody>${rows
    .slice(0, limit)
    .map(
      (t, i) =>
        `<tr><td>${i + 1}</td><td class="club"><button class="favorite" data-favorite="${esc(t.name)}" aria-label="${favorites.includes(t.name) ? "Unfollow" : "Follow"} ${esc(t.name)}">${favorites.includes(t.name) ? "★" : "☆"}</button> ${esc(t.name)}</td><td>${t.played}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gd > 0 ? "+" : ""}${t.gd}</td><td class="points">${t.points}</td><td><div class="form">${t.form.map((f) => `<i class="${f.toLowerCase()}">${f}</i>`).join("")}</div></td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function matchList(rows, limit = 10) {
  return rows.length
    ? rows
        .slice(0, limit)
        .map(
          (m) =>
            `<button class="match" data-match="${esc(m.id)}"><span>${esc(m.home)}<small>${date(m.date)}</small></span><span class="score">${m.hg ?? "–"} : ${m.ag ?? "–"}</span><span>${esc(m.away)}<small>${esc(m.status.replaceAll("_", " "))}</small></span></button>`,
        )
        .join("")
    : empty(
        "No fixtures available",
        "Live fixtures will appear after the provider completes an ingestion run.",
      );
}
function bars(rows, max, color = "") {
  return `<div class="bars">${rows.map(([name, value, label]) => `<div><div class="bar-label"><span>${esc(name)}</span><b>${esc(label ?? num(value))}</b></div><div class="track"><div class="fill ${color}" data-width="${Math.max(0, Math.min(100, (value / max) * 100))}"></div></div></div>`).join("")}</div>`;
}
function chart(points, label) {
  if (!points.length) return empty("No chart data", "Try a different filter.");
  const vals = points.map((p) => p[1]),
    min = Math.min(0, ...vals),
    max = Math.max(1, ...vals),
    x = (i) => 35 + (i / Math.max(1, points.length - 1)) * 625,
    y = (v) => 185 - ((v - min) / (max - min)) * 155;
  return `<svg class="chart" viewBox="0 0 700 230" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${[
    0, 1, 2, 3,
  ]
    .map((i) => {
      const v = min + ((max - min) * i) / 3;
      return `<line x1="35" x2="670" y1="${y(v)}" y2="${y(v)}"/><text x="0" y="${y(v) + 4}">${num(v)}</text>`;
    })
    .join(
      "",
    )}<polyline points="${points.map((p, i) => `${x(i)},${y(p[1])}`).join(" ")}"/>${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[1])}" r="3"><title>${esc(p[0])}: ${num(p[1])}</title></circle>${i % Math.max(1, Math.floor(points.length / 5)) === 0 ? `<text x="${x(i)}" y="215" text-anchor="middle">${esc(p[0])}</text>` : ""}`).join("")}</svg>`;
}
function teamSelect(id, value, allowAll = false) {
  return `<label>${id === "opponent" ? "Opponent" : id === "away" ? "Away club" : id === "home" ? "Home club" : "Club"}<select id="${id}">${allowAll ? '<option value="">All clubs</option>' : ""}${data.teams.map((t) => `<option ${t === value ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
}
function activate() {
  document
    .querySelectorAll("[data-width]")
    .forEach((e) => (e.style.width = `${e.dataset.width}%`));
  document.querySelectorAll("[data-favorite]").forEach(
    (b) =>
      (b.onclick = () => {
        const t = b.dataset.favorite;
        favorites = favorites.includes(t)
          ? favorites.filter((f) => f !== t)
          : [...favorites, t];
        try {
          localStorage.setItem(
            "touchline-favorites",
            JSON.stringify(favorites),
          );
        } catch {}
        b.textContent = favorites.includes(t) ? "★" : "☆";
        b.setAttribute(
          "aria-label",
          `${favorites.includes(t) ? "Unfollow" : "Follow"} ${t}`,
        );
      }),
  );
  document.querySelectorAll("[data-match]").forEach(
    (b) =>
      (b.onclick = () => {
        view = "matches";
        persist({ match: b.dataset.match });
        render();
      }),
  );
}
function overview() {
  const done = data.matches.filter((m) => m.status === "FINISHED"),
    goals = done.reduce((s, m) => s + m.hg + m.ag, 0),
    live = data.matches.filter((m) => ["IN_PLAY", "PAUSED"].includes(m.status));
  return (
    title(
      "THE GAME, IN CONTEXT",
      "A clearer view of football.",
      "Explore the results. Understand the patterns. Follow what comes next.",
    ) +
    `<div class="metrics">${metric("Matches in archive", num(data.total), `${data.seasons.length} seasons of perspective`)}${metric("Season matches", num(done.length), `${data.matches.length - done.length} scheduled or in progress`)}${metric("Goals per match", done.length ? (goals / done.length).toFixed(2) : "—", "Selected season · completed matches")}${metric("Live right now", live.length, data.health.stale ? "Live coverage not verified" : "Last successful ingestion verified")}</div><div class="grid"><div>${panel("The season, at a glance", "Computed from available results · points / goal difference / goals scored", data.table.length ? table(data.table) : empty("No results yet", "Select La Liga to explore the bundled historical archive."))}</div><div>${panel("Latest results", "Open a match for its research page", matchList([...done].reverse(), 5))}${panel(
      "Club strength index",
      "Elo · results-based · 65-point home advantage",
      bars(
        data.ratings
          .slice(0, 5)
          .map((t) => [t.name, t.rating, Math.round(t.rating)]),
        2200,
      ),
    )}</div></div>`
  );
}
async function matches() {
  const id = new URLSearchParams(location.search).get("match"),
    m = id ? await api("match", { id }).catch(() => null) : null;
  if (!m)
    return (
      title(
        "MATCH INTELLIGENCE",
        "Every fixture. More context.",
        "A permanent research page for every match in the selected season.",
      ) +
      panel(
        "Match center",
        "Most recent fixtures first",
        matchList([...data.matches].reverse(), 2000),
      )
    );
  let forecast;
  try {
    forecast = await api("predict", {
      home: m.home,
      away: m.away,
      before: m.date,
    });
  } catch {}
  let payload = {};
  try {
    payload = JSON.parse(m.payload) || {};
  } catch {}
  const goals = payload.goals || [],
    lineups = [
      ...(payload.homeTeam?.lineup || []),
      ...(payload.awayTeam?.lineup || []),
    ];
  return (
    title(
      "MATCH INTELLIGENCE",
      `${esc(m.home)} <span class="muted">vs</span> ${esc(m.away)}`,
      `${date(m.date)} · ${esc(m.status)} · ${esc(m.source)}`,
    ) +
    `<section class="panel hero-score"><div class="eyebrow">${esc(m.season)} / ${esc(m.status.replaceAll("_", " "))}</div><strong>${m.hg ?? "–"} : ${m.ag ?? "–"}</strong><p class="sub">${esc(m.home)} &nbsp; / &nbsp; ${esc(m.away)}</p></section><div class="two-col">${panel("Prematch model", "Only results from earlier calendar dates are used", forecast ? probability(forecast) : empty("Insufficient history", "No forecast is available for this fixture."))}${panel("Match timeline", "Provider event coverage varies by competition and plan", goals.length ? goals.map((g) => `<p><span class="tag">${g.minute}′</span> ${esc(g.scorer?.name || "Goal")} · ${esc(g.team?.name || "")}</p>`).join("") : empty("Event data unavailable", "The score is available; shot maps, xG and event timelines are not supplied for this match."))}</div>${panel("Lineups", "Only provider-supplied player records are shown", lineups.length ? lineups.map((p) => `<span class="tag">${esc(p.name)} · ${esc(p.position)}</span>`).join("") : empty("Lineups unavailable", "No player lineup records have been ingested for this fixture."))}`
  );
}
function probability(p) {
  return `<div class="probabilities"><span data-width="${p.home * 100}">${pct(p.home)}</span><span data-width="${p.draw * 100}">${pct(p.draw)}</span><span data-width="${p.away * 100}">${pct(p.away)}</span></div><div class="bar-label"><span>Home win</span><span>Draw</span><span>Away win</span></div><p class="sub">Model goals: ${p.homeGoals.toFixed(2)} / ${p.awayGoals.toFixed(2)}. These are goals-model expectations, not shot-based xG.</p><p class="sub">${p.sample} recent training matches · ${esc(p.version)}</p>`;
}
async function historical(teamMode = false) {
  const q = new URLSearchParams(location.search),
    team =
      q.get("team") ||
      (teamMode
        ? data.teams.includes(favorites[0])
          ? favorites[0]
          : data.teams.includes("Barcelona")
            ? "Barcelona"
            : data.teams[0] || ""
        : ""),
    opponent = q.get("opponent") || "";
  const h = await api("history", {
      team,
      opponent,
      from: q.get("from") || "",
      to: q.get("to") || "9999",
    }),
    t = h.table.find((t) => t.name === team);
  window.exportRows = h.matches;
  return (
    title(
      teamMode ? "CLUB INTELLIGENCE" : "HISTORICAL EXPLORER",
      teamMode ? esc(team) : "History has a pattern.",
      `Available records only · ${date(data.coverage.first)} onward · no claim of complete all-time coverage`,
    ) +
    `<form id="history-filters" class="filters">${teamSelect("team", team, !teamMode)}${teamSelect("opponent", opponent, true)}<label>From season<select id="from"><option value="">First available</option>${[
      ...data.seasons,
    ]
      .reverse()
      .map(
        (s) => `<option ${s === q.get("from") ? "selected" : ""}>${s}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Through season<select id="to"><option value="">Latest available</option>${data.seasons.map((s) => `<option ${s === q.get("to") ? "selected" : ""}>${s}</option>`).join("")}</select></label><button class="button">Explore</button><button type="button" id="export" class="button secondary">Export CSV</button></form><div class="metrics">${metric("Recorded matches", num(h.matches.length), "Filtered historical coverage")}${metric(team ? "Club win rate" : "Home win rate", h.matches.length ? pct(team ? (t?.w || 0) / h.matches.length : h.matches.filter((m) => m.hg > m.ag).length / h.matches.length) : "—", "Across selected matches")}${metric("Goals per match", h.matches.length ? (h.matches.reduce((s, m) => s + m.hg + m.ag, 0) / h.matches.length).toFixed(2) : "—", "Full-time goals, both sides")}${metric(team ? "Club goal difference" : "Seasons", team ? (t?.gd ?? "—") : h.seasons.length, "Within selected coverage")}</div><div class="two-col">${panel(
      team ? "Points per game over time" : "Scoring environment over time",
      "Each point represents an available season",
      chart(
        h.seasons
          .filter((s) => !team || s.team)
          .map((s) => [s.season, team ? s.team.ppg : s.goals]),
        team ? "Points per game by season" : "Goals per match by season",
      ),
    )}${panel(
      "Home advantage over time",
      "Share of completed matches won by the home side",
      chart(
        h.seasons.map((s) => [s.season, s.homeWin * 100]),
        "Home win percentage by season",
      ),
    )}</div>${panel("Match archive", `${h.matches.length.toLocaleString()} records · showing latest 100 · export contains all filtered records`, matchList([...h.matches].reverse(), 100))}`
  );
}
async function forecast() {
  const q = new URLSearchParams(location.search),
    home =
      q.get("home") ||
      (data.teams.includes(favorites[0])
        ? favorites[0]
        : data.teams.includes("Barcelona")
          ? "Barcelona"
          : data.teams[0]),
    away =
      q.get("away") ||
      (data.teams.includes("Real Madrid") ? "Real Madrid" : data.teams[1]);
  let p;
  try {
    p = await api("predict", { home, away });
  } catch {}
  const evaluation = await api("evaluation");
  return (
    title(
      "TRANSPARENT BY DESIGN",
      "The forecast lab.",
      "Probabilities, not promises. Inspect the evidence behind every prediction.",
    ) +
    `<form id="forecast-filters" class="filters">${teamSelect("home", home)}${teamSelect("away", away)}<button class="button">Run forecast</button></form><div class="two-col">${panel(`${esc(home)} vs ${esc(away)}`, "Poisson goals model · league-mean shrinkage · home advantage", p ? probability(p) + `<p class="sub">Training through ${date(p.trainingThrough)}. Latest available history; this is not necessarily a current fixture forecast.</p>` : empty("Choose clubs with history", "Both clubs need recorded results in this competition."))}${panel(
      "Likely scorelines",
      "Truncated display of the full score distribution",
      p
        ? bars(
            p.scores.map((s) => [`${s.home} – ${s.away}`, s.p, pct(s.p)]),
            Math.max(...p.scores.map((s) => s.p)),
            "blue",
          )
        : "",
    )}</div>${
      evaluation.modelMetrics
        ? `<div class="metrics">${metric("Held-out matches", num(evaluation.modelMetrics.matches), "Walk-forward · prior dates only")}${metric("Model log loss", evaluation.modelMetrics.logLoss.toFixed(3), "Lower is better")}${metric("Baseline log loss", evaluation.baselineMetrics.logLoss.toFixed(3), "Expanding historical H / D / A frequencies")}${metric("Multiclass Brier", evaluation.modelMetrics.brier.toFixed(3), "Sum across 3 outcomes · lower is better")}</div><div class="two-col">${panel(
            "Calibration",
            "Observed outcome frequency versus predicted probability",
            chart(
              evaluation.calibration
                .filter((b) => b.count)
                .map((b) => [b.bin, b.observed * 100]),
              "Observed frequency in probability bins",
            ) +
              `<div class="table-wrap"><table><thead><tr><th>Probability bin</th><th>Count</th><th>Predicted</th><th>Observed</th></tr></thead><tbody>${evaluation.calibration
                .filter((b) => b.count)
                .map(
                  (b) =>
                    `<tr><td>${esc(b.bin)}</td><td>${b.count}</td><td>${pct(b.predicted)}</td><td>${pct(b.observed)}</td></tr>`,
                )
                .join("")}</tbody></table></div>`,
          )}${panel("Evaluation protocol", `${esc(evaluation.competition)} archive · ${esc(evaluation.startSeason)} onward · through ${date(evaluation.dataThrough)}`, `<ul class="list"><li>Same-day results are excluded from training.</li><li>Model: ${esc(evaluation.model)}.</li><li>Baseline uses only previous results.</li><li>Calibration bins pool all three outcomes.</li><li>Parameters were not selected through a documented tuning study.</li><li>No guarantee of predictive improvement or betting profit.</li></ul>`)}</div>`
        : panel(
            "Evaluation pending",
            "No accuracy claims without an evaluation artifact",
            empty(
              "Evaluation not generated",
              "Run the documented evaluation command before publishing model results.",
            ),
          )
    }`
  );
}
function players() {
  const scorers = data.scorers?.scorers || [];
  return (
    title(
      "PLAYER INTELLIGENCE",
      "The players behind the numbers.",
      "Source-backed scoring leaders. Advanced scouting requires richer event coverage.",
    ) +
    panel(
      "Competition scoring leaders",
      "Provider current-season snapshot · this does not follow the historical season selector",
      scorers.length
        ? `<div class="table-wrap"><table><thead><tr><th>Player</th><th>Club</th><th>Goals</th><th>Assists</th><th>Penalties</th></tr></thead><tbody>${scorers.map((s) => `<tr><td>${esc(s.player?.name)}</td><td>${esc(s.team?.name)}</td><td class="points">${s.goals ?? "—"}</td><td>${s.assists ?? "—"}</td><td>${s.penalties ?? "—"}</td></tr>`).join("")}</tbody></table></div>`
        : empty(
            "Player data not connected",
            "The bundled results archive contains no player statistics. Connect a provider to ingest scoring leaders.",
          ),
    ) +
    panel(
      "Scouting coverage",
      "Data requirements",
      `<p class="sub">Per-90 comparisons, positional percentiles, similar-player search, passing networks and shot maps need licensed player minutes and event data. No values are estimated to fill these gaps.</p>`,
    )
  );
}
async function status() {
  const h = data.health;
  const quality = auditPanel(await api("audit"), { panel, esc });
  return (
    quality +
    title(
      "DATA & RELIABILITY",
      "Trust starts with provenance.",
      "Freshness, coverage and operational state—visible rather than assumed.",
    ) +
    `<div class="metrics">${metric("Provider", h.configured ? "Configured" : "Not connected", "football-data.org")}${metric("Ingestion", h.run ? esc(h.run.status) : "Not started", h.lastSuccess ? `Last success ${date(h.lastSuccess)}` : "No successful live ingestion")}${metric("Freshness", h.stale ? "Unverified" : "Within target", "Stale threshold: 20 minutes")}${metric("Archive ends", date(data.coverage.last), "Most recent scheduled or recorded match")}</div><div class="two-col">${panel("Coverage contract", "What this workspace can substantiate", `<ul class="list"><li>Bundled La Liga results: 1995 onward, ending October 27, 2025.</li><li>Premier League records require provider ingestion.</li><li>Historical archive and live fixtures are deduplicated using competition, season and canonical clubs.</li><li>Results tables use points, goal difference and goals scored. They do not implement every competition’s official tie-break rules or sanctions.</li><li>Live speed and statistical depth depend on provider subscription.</li><li>Archive import time is not presented as data freshness.</li></ul>`)}${panel("Update strategy", "Persistent SQLite storage · background worker", `<ul class="list"><li>Updates continue while the server runs, even without visitors.</li><li>60-second target cycle near live fixtures; 15 minutes otherwise, plus request duration.</li><li>Current seasons are refetched to recover corrections and missed fixtures.</li><li>Rate-limited calls, timeout, bounded retries and atomic match batches.</li><li>Failures keep previously ingested data available.</li><li>Public health endpoint: <a href="/api/health">/api/health</a>.</li></ul>`)}</div>${h.run?.error ? `<div class="notice error">Latest ingestion error: ${esc(h.run.error)}</div>` : ""}`
  );
}
async function render() {
  const token = ++request;
  $("#content").classList.add("loading");
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#crumb").textContent =
    {
      overview: "Overview",
      matches: "Match center",
      history: "Historical explorer",
      teams: "Club intelligence",
      forecast: "Forecast lab",
      studio: "Research studio",
      simulation: "Season simulator",
      players: "Player leaders",
      status: "Data & reliability",
    }[view] || "Overview";
  persist();
  try {
    const html =
      view === "studio"
        ? await studioView({ api, data, title, panel, empty, esc })
        : view === "matches"
          ? await matches()
          : view === "history"
            ? await historical()
            : view === "teams"
              ? await historical(true)
              : view === "forecast"
                ? await forecast()
                : view === "simulation"
                  ? await simulationView({
                      api,
                      data,
                      title,
                      panel,
                      empty,
                      esc,
                      pct,
                    })
                  : view === "players"
                    ? players()
                    : view === "status"
                      ? await status()
                      : overview();
    if (token !== request) return;
    $("#content").innerHTML = html;
    activate();
    if (view === "studio") bindStudio({ persist, render });
    if ($("#simulation-filters"))
      $("#simulation-filters").onsubmit = (e) => {
        e.preventDefault();
        persist({
          fixture: $("#fixture").value,
          hg: $("#hg").value,
          ag: $("#ag").value,
        });
        render();
      };
    if ($("#history-filters"))
      $("#history-filters").onsubmit = (e) => {
        e.preventDefault();
        persist(
          Object.fromEntries(
            ["team", "opponent", "from", "to"].map((k) => [
              k,
              $(`#${k}`).value,
            ]),
          ),
        );
        render();
      };
    if ($("#forecast-filters"))
      $("#forecast-filters").onsubmit = (e) => {
        e.preventDefault();
        persist({ home: $("#home").value, away: $("#away").value });
        render();
      };
    if ($("#export")) $("#export").onclick = exportCSV;
  } catch (e) {
    if (token === request)
      $("#content").innerHTML = empty(
        "Unable to load this view",
        esc(e.message),
      );
  } finally {
    if (token === request) $("#content").classList.remove("loading");
  }
}
function exportCSV() {
  const cols = [
    "date",
    "competition",
    "season",
    "home",
    "away",
    "hg",
    "ag",
    "status",
    "source",
  ];
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const csv = [
    cols.join(","),
    ...window.exportRows.map((m) => cols.map((k) => cell(m[k])).join(",")),
  ].join("\r\n");
  const a = document.createElement("a");
  const link = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.href = link;
  a.download = "touchline-match-archive.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(link), 1000);
}
async function load() {
  try {
    data = await api("overview");
    const selected = $("#season").value || params.get("season");
    $("#season").innerHTML = data.seasons
      .map((s) => `<option ${s === selected ? "selected" : ""}>${s}</option>`)
      .join("");
    if ($("#season").value !== data.season) data = await api("overview");
    const h = data.health;
    $("#notice").innerHTML =
      `<div class="notice ${!h.stale ? "live" : ""}">${h.stale ? "◷ Historical workspace · live freshness unverified." : "● Provider connected · ingestion within freshness target."} ${h.lastSuccess ? `Last successful sync: ${esc(new Date(h.lastSuccess).toLocaleString())}.` : "Connect a provider key to enable automatic live ingestion."} Archive ends October 27, 2025.</div>`;
    await render();
  } catch (e) {
    $("#content").innerHTML = empty("Service unavailable", esc(e.message));
  }
}
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      render();
    }),
);
$("#competition").onchange = () => {
  $("#season").innerHTML = "";
  load();
};
$("#season").onchange = load;
$("#refresh").onclick = load;
await load();
setInterval(() => {
  if (view !== 'studio' && !document.hidden && !document.querySelector("form :focus")) load();
}, 60000);
