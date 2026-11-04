export async function simulationView({
  api,
  data,
  title,
  panel,
  empty,
  esc,
  pct,
}) {
  const q = new URLSearchParams(location.search),
    fixture = q.get("fixture") || "",
    hg = q.get("hg") || "0",
    ag = q.get("ag") || "0";
  const result = await api("simulation", fixture ? { fixture, hg, ag } : {});
  const fixtures = data.matches.filter((m) =>
    ["SCHEDULED", "TIMED"].includes(m.status),
  );
  const form = `<form id="simulation-filters" class="filters"><label>Scenario fixture<select id="fixture"><option value="">No override · baseline</option>${fixtures.map((m) => `<option value="${esc(m.id)}" ${m.id === fixture ? "selected" : ""}>${esc(m.home)} vs ${esc(m.away)}</option>`).join("")}</select></label><label>Home goals<input id="hg" type="number" min="0" max="20" value="${esc(hg)}"></label><label>Away goals<input id="ag" type="number" min="0" max="20" value="${esc(ag)}"></label><button class="button">Simulate season</button></form>`;
  return (
    title(
      "ONE RESULT CAN CHANGE EVERYTHING",
      "The season, a thousand ways.",
      "Explore rank probabilities and the effect of a hypothetical result.",
    ) +
    form +
    (result.unavailable
      ? empty("Remaining fixtures unavailable", esc(result.message))
      : panel(
          "Projected finish",
          `${result.iterations.toLocaleString()} seeded simulations · ${result.remaining} remaining fixtures`,
          `<div class="table-wrap"><table><thead><tr><th>Club</th><th>Avg rank</th><th>Avg points</th><th>Title</th><th>Top 4</th><th>Bottom 3</th></tr></thead><tbody>${result.teams.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.position.toFixed(1)}</td><td>${t.points.toFixed(1)}</td><td class="points">${pct(t.title)}</td><td>${pct(t.top4)}</td><td>${pct(t.bottom3)}</td></tr>`).join("")}</tbody></table></div><p class="sub">${esc(result.assumptions)}</p><p class="sub">Seed ${result.seed}; sampling uncertainty and model error apply. Teams retain fixed strengths across the simulation.</p>`,
        ))
  );
}
