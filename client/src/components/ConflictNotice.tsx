import { STATUS_LABELS, type ConflictDetails, type TicketDetail, type UserSummary } from "../api/types";
import type { TicketChanges } from "./TicketUpdateForm";

interface Props {
  details: ConflictDetails;
  /** The ticket as this user loaded it (the stale version). */
  loaded: TicketDetail;
  attempted: TicketChanges;
  users: UserSummary[] | undefined;
  onReload: () => void;
  reloading: boolean;
}

/**
 * Shown when the server rejected a save with 409 because someone else changed the ticket first.
 * Makes clear nothing was saved, shows what changed on both sides, and offers a reload.
 */
export function ConflictNotice({ details, loaded, attempted, users, onReload, reloading }: Props) {
  const latest = details.currentTicket;
  const userName = (id: number | null | undefined) =>
    id == null ? "Unassigned" : (users?.find((u) => u.id === id)?.name ?? `User #${id}`);

  const rows = [
    {
      field: "Status",
      opened: STATUS_LABELS[loaded.status],
      yours: attempted.status === undefined ? undefined : STATUS_LABELS[attempted.status],
      latest: STATUS_LABELS[latest.status],
    },
    {
      field: "Assignee",
      opened: userName(loaded.assignee?.id),
      yours: attempted.assigneeId === undefined ? undefined : userName(attempted.assigneeId),
      latest: userName(latest.assignee?.id),
    },
  ].filter((r) => r.yours !== undefined || r.opened !== r.latest);

  return (
    <div className="message conflict" role="alert">
      <strong>Your changes were not saved.</strong> Someone else updated this ticket after you opened it (you were
      editing version {details.yourVersion}; the latest is version {details.currentVersion}).
      <table>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">When you opened it</th>
            <th scope="col">Your unsaved change</th>
            <th scope="col">Latest saved value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field}>
              <td>{r.field}</td>
              <td>{r.opened}</td>
              <td>{r.yours ?? <span className="muted">(not changed)</span>}</td>
              <td>
                <strong>{r.latest}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Reload the latest version, check it, and apply your change again if it is still needed.</p>
      <button type="button" onClick={onReload} disabled={reloading}>
        {reloading ? "Reloading…" : "Reload latest ticket"}
      </button>
    </div>
  );
}
