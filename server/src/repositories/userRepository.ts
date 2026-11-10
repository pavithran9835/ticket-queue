import type { Db } from "../db.js";
import type { UserSummary } from "../domain.js";

export function listUsers(db: Db): UserSummary[] {
  return db.prepare("SELECT id, name FROM users ORDER BY name, id").all() as UserSummary[];
}

export function userExists(db: Db, id: number): boolean {
  return db.prepare("SELECT 1 FROM users WHERE id = ?").get(id) !== undefined;
}
