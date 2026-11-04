export function auditPanel(report, { panel, esc }) {
  return panel(
    "Historical data quality",
    `${report.records.toLocaleString()} completed records · internal consistency checks`,
    `<div class="metrics"><div class="metric"><label>Invalid records</label><div class="value">${report.invalid}</div></div><div class="metric"><label>Duplicate fixtures</label><div class="value">${report.duplicateFixtures.length}</div></div></div><details><summary>Inspect season completeness</summary><div class="table-wrap"><table><thead><tr><th>Season</th><th>Clubs</th><th>Recorded</th><th>Expected</th><th>Missing pairings</th></tr></thead><tbody>${report.seasons.map((s) => `<tr><td>${esc(s.season)}</td><td>${s.clubs}</td><td>${s.records}</td><td>${s.expected}</td><td>${s.missing}</td></tr>`).join("")}</tbody></table></div></details><p class="sub">Expected fixtures assume each observed club plays every other observed club home and away. This is a diagnostic, not proof of completeness: wholly absent clubs and incorrect scores require external verification.</p><p class="sub">${esc(report.sourceNote)}</p>`,
  );
}
