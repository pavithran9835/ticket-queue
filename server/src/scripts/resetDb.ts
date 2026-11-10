/** Recreates the app's working database from the supplied (unmodified) seed file. */
import { copySeedDatabase } from "../db.js";
import { DB_PATH, SEED_DB_PATH } from "../config.js";

copySeedDatabase(SEED_DB_PATH, DB_PATH);
console.log(`Working database reset: ${DB_PATH} (copied from ${SEED_DB_PATH})`);
