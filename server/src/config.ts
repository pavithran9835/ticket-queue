import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The supplied, unmodified assessment database. Never written to. */
export const SEED_DB_PATH = path.join(repoRoot, "data", "ticket-assessment-data.sqlite");

/** Working copy used by the running app, recreated from the seed with `npm run db:reset`. */
export const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(repoRoot, "data", "tickets.dev.sqlite");

export const PORT = Number(process.env.PORT ?? 3001);
