import fs from "node:fs";
import Database from "better-sqlite3";

export type Db = Database.Database;

/** Copies the seed database to `targetPath` (overwriting it). The seed file is only read. */
export function copySeedDatabase(seedPath: string, targetPath: string): void {
  fs.copyFileSync(seedPath, targetPath);
}

/** Creates the working copy from the seed if it does not exist yet. */
export function ensureWorkingCopy(seedPath: string, targetPath: string): void {
  if (!fs.existsSync(targetPath)) copySeedDatabase(seedPath, targetPath);
}

export function openDatabase(filePath: string): Db {
  const db = new Database(filePath, { fileMustExist: true });
  // SQLite leaves foreign keys off by default; turn them on so assignee_id can never point at a missing user.
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}
