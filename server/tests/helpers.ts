import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createApp } from "../src/app.js";
import { SEED_DB_PATH } from "../src/config.js";
import { copySeedDatabase, openDatabase, type Db } from "../src/db.js";

export const SEED_SHA256 = "85bb5ccda384d7a6909edaa35733069ff7c7937c28173b1cfef82b213903b982";

export function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/**
 * Each test gets its own throw-away copy of the supplied database in the OS temp dir,
 * so tests are isolated from each other and the supplied file is never written to.
 */
export function createTestContext() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ticket-queue-test-"));
  const dbPath = path.join(dir, "test.sqlite");
  copySeedDatabase(SEED_DB_PATH, dbPath);
  const db: Db = openDatabase(dbPath);
  const app = createApp(db);
  return {
    app,
    db,
    dbPath,
    cleanup() {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
      // Guard rail: fail loudly if anything ever wrote to the supplied database.
      if (sha256(SEED_DB_PATH) !== SEED_SHA256) throw new Error("The supplied SQLite file was modified!");
    },
  };
}
