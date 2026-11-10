/**
 * Child process used by the race test. Opens its OWN connection to the database file, waits until a shared
 * start instant (so all processes fire together), then attempts one optimistic update and prints the outcome.
 * argv: dbPath ticketId expectedVersion assigneeId startAtMs
 */
import { openDatabase } from "../../src/db.js";
import { updateTicket } from "../../src/repositories/ticketRepository.js";

const [dbPath, ticketId, version, assigneeId, startAt] = process.argv.slice(2);
const db = openDatabase(dbPath);
while (Date.now() < Number(startAt)) {
  /* spin until the shared start instant */
}
const result = updateTicket(db, Number(ticketId), Number(version), { assigneeId: Number(assigneeId) });
db.close();
process.stdout.write(result.kind);
