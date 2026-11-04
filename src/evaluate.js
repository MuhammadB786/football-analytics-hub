import { openStore } from "./store.js";
import { evaluate } from "./analytics.js";
import { writeFileSync, mkdirSync } from "node:fs";
const store = openStore();
try {
  const rows = store
    .all()
    .filter((m) => m.competition === "PD" && m.source === "archive");
  const result = {
    ...evaluate(rows),
    competition: "PD",
    source: "Bundled La Liga archive",
    dataThrough: rows.at(-1)?.date,
  };
  const json = JSON.stringify(result, null, 2);
  mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
  writeFileSync(
    new URL("../reports/evaluation.json", import.meta.url),
    json + "\n",
  );
  console.log(json);
} finally {
  store.db.close();
}
