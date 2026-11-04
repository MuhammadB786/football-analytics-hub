import { openStore } from "./store.js";
import { FootballProvider, sync } from "./provider.js";
if (
  !process.env.FOOTBALL_API_KEY ||
  process.env.FOOTBALL_API_KEY === "your_key_here"
)
  throw new Error("Set FOOTBALL_API_KEY to run ingestion");
const store = openStore();
try {
  console.log(
    JSON.stringify({
      ingested: await sync(
        store,
        new FootballProvider(process.env.FOOTBALL_API_KEY),
      ),
    }),
  );
} finally {
  store.db.close();
}
