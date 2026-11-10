import { createApp } from "./app.js";
import { DB_PATH, PORT, SEED_DB_PATH } from "./config.js";
import { ensureWorkingCopy, openDatabase } from "./db.js";

ensureWorkingCopy(SEED_DB_PATH, DB_PATH);
const db = openDatabase(DB_PATH);
const app = createApp(db, { logRequests: true });

const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (database: ${DB_PATH})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
