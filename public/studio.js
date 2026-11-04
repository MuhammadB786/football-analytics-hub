let evidence,
  selectedFact = 0;
const $ = (s) => document.querySelector(s);
export async function studioView({ api, data, title, panel, empty, esc }) {
  const preset=new URLSearchParams(location.search).get('fact');
  if(preset!==null&&['0','1','2','3'].includes(preset))selectedFact=Number(preset);
  const q = new URLSearchParams(location.search),
    team =
      q.get("team") ||
      (data.teams.includes("Barcelona") ? "Barcelona" : data.teams[0]),
    opponent = q.get("opponent") || "";
  if (!team)
    return (
      title(
        "EDITORIAL WORKSPACE",
        "Research worth sharing.",
        "No subscription required for the bundled historical archive.",
      ) +
      empty(
        "No recorded clubs",
        "Select La Liga to explore the historical dataset.",
      )
    );
  evidence = await api("research", {
    team,
    opponent,
    from: q.get("from") || "",
    to: q.get("to") || "9999",
  });
  const options = (values, selected) =>
    values
      .map(
        (v) => `<option ${v === selected ? "selected" : ""}>${esc(v)}</option>`,
      )
      .join("");
  const current = evidence;
  return (
    title(
      "EDITORIAL WORKSPACE",
      "From a finding to a story.",
      "Research a claim. Inspect the results. Export a graphic with its evidence.",
    ) +
    `<form id="studio-filters" class="filters"><label>Research club<select id="research-team">${options(data.teams, team)}</select></label><label>Research opponent<select id="research-opponent"><option value="">All opponents</option>${options(
      data.teams.filter((t) => t !== team),
      opponent,
    )}</select></label><label>Research from<select id="research-from"><option value="">First available</option>${options([...data.seasons].reverse(), q.get("from"))}</select></label><label>Research through<select id="research-to"><option value="">Latest available</option>${options(data.seasons, q.get("to"))}</select></label><button class="button">Find the story</button></form>${
      current.facts.length
        ? `<div class="two-col"><div>${panel("Verified arithmetic, visible evidence", esc(current.scope), `<div class="story-list">${current.facts.map((f, i) => `<button class="story-option ${i === selectedFact ? "selected" : ""}" data-fact="${i}" aria-pressed="${i === selectedFact}"><span class="eyebrow">${esc(f.unit)}</span><strong>${esc(f.headline)}</strong><span class="sub">${esc(f.detail)}</span></button>`).join("")}</div><p class="sub">Claims describe the selected records. They do not establish complete all-time coverage.</p>`)}${panel("Export settings", "Independent concept branding; no affiliation implied", `<div class="filters"><label>Card byline<input id="card-brand" value="FOOTBALL ANALYTICS HUB" maxlength="32"></label><label>Card format<select id="card-format"><option value="landscape">Landscape · 1200 × 675</option><option value="square">Square · 1080 × 1080</option></select></label></div><div class="export-actions"><button id="card-download" class="button">Download PNG</button><button id="evidence-download" class="button secondary">Download evidence JSON</button><button id="caption-download" class="button secondary">Download caption</button></div><p id="studio-feedback" class="sub" role="status"></p>`)}</div><div>${panel("Publication preview", "Source, date range and sample size travel with the graphic", `<canvas id="publication-card" role="img" aria-label="Historical football statistics card. The full claim and evidence appear in adjacent text."></canvas><p class="sub">Review data provenance and usage rights before publishing. Independent prototype; not associated with @TouchlineX.</p>`)}</div></div>${panel(
            "Cross-era attack index",
            "Club goals per match ÷ league goals per club per match · all opponents in each available season",
            `<div class="table-wrap"><table><thead><tr><th>Season</th><th>Played</th><th>Club goals / game</th><th>League average</th><th>Attack index</th><th>Coverage</th></tr></thead><tbody>${[
              ...current.normalized,
            ]
              .reverse()
              .map(
                (s) =>
                  `<tr><td>${esc(s.season)}</td><td>${s.played}</td><td>${s.goalsPerGame.toFixed(2)}</td><td>${s.leagueGoalsPerTeamGame.toFixed(2)}</td><td class="points">${s.attackIndex?.toFixed(2) ?? "—"}×</td><td>${s.seasonComplete ? "Round-robin count matched" : "Partial / count incomplete"}</td></tr>`,
              )
              .join(
                "",
              )}</tbody></table></div><p class="sub">This table uses every recorded opponent, even when a head-to-head opponent is selected above. It adjusts for league scoring environment, not strength of schedule. A matching fixture count is not independent validation of results.</p>`,
          )}${panel(
            "Evidence ledger",
            `${current.matches.length} full-time results support the selected claim`,
            `<p class="sub">SHA-256 <code class="fingerprint">${esc(current.fingerprint)}</code></p><details><summary>Inspect latest 20 source records</summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Home</th><th>Score</th><th>Away</th><th>Source</th></tr></thead><tbody>${current.matches
              .slice(-20)
              .reverse()
              .map(
                (m) =>
                  `<tr><td>${esc(m.date.slice(0, 10))}</td><td>${esc(m.home)}</td><td>${m.hg}–${m.ag}</td><td>${esc(m.away)}</td><td>${esc(m.source)}</td></tr>`,
              )
              .join(
                "",
              )}</tbody></table></div></details><p class="sub">${esc(current.quality.sourceNote)}</p>`,
          )}`
        : empty(
            "No matching results",
            "Change the date range or opponent and try again.",
          )
    }`
  );
}
function download(blob, name) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function text(ctx, value, x, y, width, size, color = "#e8eef0", weight = 400) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  const words = String(value).split(/\s+/);
  let line = "",
    cursor = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(line, x, cursor);
      cursor += size * 1.3;
      line = word;
    } else line = next;
  }
  ctx.fillText(line, x, cursor);
  return cursor + size * 1.3;
}
function draw() {
  const canvas = $("#publication-card");
  if (!canvas || !evidence.facts.length) return;
  selectedFact = Math.min(selectedFact, evidence.facts.length - 1);
  const f = evidence.facts[selectedFact],
    square = $("#card-format").value === "square",
    w = square ? 1080 : 1200,
    h = square ? 1080 : 675;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  canvas.setAttribute('aria-label',`${f.title}. ${f.headline} ${f.scope}. Source: ${evidence.provenance.sources.join(', ')}. Independent historical prototype.`);
  ctx.fillStyle = "#0b1014";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#bcf66b";
  ctx.fillRect(0, 0, 12, h);
  const pad = 60;
  text(
    ctx,
    $("#card-brand").value.trim() || "FOOTBALL ANALYTICS HUB",
    pad,
    64,
    w - 120,
    23,
    "#bcf66b",
    700,
  );
  text(ctx, f.title, pad, square ? 150 : 125, w - 120, 38, "#e8eef0", 700);
  text(
    ctx,
    f.value,
    pad,
    square ? 400 : 285,
    w - 120,
    square ? 150 : 112,
    "#bcf66b",
    700,
  );
  text(ctx, f.unit, pad, square ? 465 : 340, w - 120, 21, "#91a2ae", 700);
  f.metrics.forEach(([label, value], i) => {
    const x = pad + (i * (w - 120)) / 3;
    text(ctx, value, x, square ? 620 : 425, 290, 40, "#e8eef0", 700);
    text(ctx, label.toUpperCase(), x, square ? 661 : 461, 290, 17, "#91a2ae");
  });
  const rule = square ? 755 : 505;
  ctx.fillStyle = "#26323b";
  ctx.fillRect(pad, rule, w - 120, 2);
  text(ctx, f.scope, pad, rule + 40, w - 120, 22, "#e8eef0");
  text(
    ctx,
    `Source: ${evidence.provenance.sources.map((s) => (s === "archive" ? "repository La Liga archive (Kaggle-sourced)" : s)).join(" + ")}. Coverage-limited historical results.`,
    pad,
    rule + 85,
    w - 120,
    16,
    "#91a2ae",
  );
  text(
    ctx,
    `Independent prototype · Evidence ${evidence.fingerprint.slice(0, 16)} · Review before publication`,
    pad,
    h - 33,
    w - 120,
    15,
    "#91a2ae",
  );
}
export function bindStudio({ persist, render }) {
  if (!$("#studio-filters")) return;
  $("#studio-filters").onsubmit = (e) => {
    e.preventDefault();
    selectedFact = 0;
    persist({
      team: $("#research-team").value,
      opponent: $("#research-opponent").value,
      from: $("#research-from").value,
      to: $("#research-to").value,
    });
    render();
  };
  $("#research-team").onchange = () => {
    if ($("#research-team").value === $("#research-opponent").value)
      $("#research-opponent").value = "";
  };
  if (!$("#publication-card")) return;
  draw();
  $("#card-brand").oninput = draw;
  $("#card-format").onchange = draw;
  document.querySelectorAll("[data-fact]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedFact = Number(b.dataset.fact);
        document.querySelectorAll("[data-fact]").forEach((x) => {
          x.classList.toggle("selected", x === b);
          x.setAttribute("aria-pressed", String(x === b));
        });
        draw();
      }),
  );
  $("#card-download").onclick = () => {
    $("#publication-card").toBlob((blob) => {
      if (blob) {
        const name=`${evidence.team}-${evidence.opponent||evidence.matches[0]?.season||'history'}-${evidence.facts[selectedFact].key}`.replace(/[^a-zA-Z0-9-]/g,'-').toLowerCase();
        download(blob, `${name}.png`);
        $("#studio-feedback").textContent =
          "PNG exported. Review the evidence and data rights before publishing.";
      }
    }, "image/png");
  };
  $("#evidence-download").onclick = () =>
    download(
      new Blob(
        [
          JSON.stringify(
            { ...evidence, selectedFact: evidence.facts[selectedFact] },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "football-research-evidence.json",
    );
  $("#caption-download").onclick = () => {
    const f = evidence.facts[selectedFact];
    download(
      new Blob(
        [
          `${f.headline}\n${f.scope}\nSource: repository historical archive.\nEvidence SHA-256: ${evidence.fingerprint}\n${evidence.quality.sourceNote}\n${evidence.provenance.affiliation}`,
        ],
        { type: "text/plain" },
      ),
      "football-research-caption.txt",
    );
  };
}
