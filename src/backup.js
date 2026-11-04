import { backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openStore } from "./store.js";

const store = openStore();
try {
  const directory = resolve("data/backups");
  mkdirSync(directory, { recursive: true });
  const destination = resolve(
    directory,
    `football-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
  );
  await backup(store.db, destination);
  console.log(JSON.stringify({ event: "backup_complete", destination }));
} finally {
  store.db.close();
}
