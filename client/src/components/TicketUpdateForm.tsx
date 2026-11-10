import { useState, type FormEvent } from "react";
import { STATUS_LABELS, TICKET_STATUSES, type TicketDetail, type TicketStatus, type UserSummary } from "../api/types";

export interface TicketChanges {
  status?: TicketStatus;
  assigneeId?: number | null;
}

interface Props {
  ticket: TicketDetail;
  users: UserSummary[] | undefined;
  usersError?: boolean;
  disabled: boolean;
  onSubmit: (changes: TicketChanges) => void;
}

const UNASSIGNED = "";

/**
 * Edits status and assignee. Only allowed status values are offered (mirrors the DB CHECK constraint);
 * only fields that actually changed are sent. The parent remounts this form (via `key`) whenever a new
 * version of the ticket is loaded, which resets the fields to the server's values.
 */
export function TicketUpdateForm({ ticket, users, usersError, disabled, onSubmit }: Props) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignee, setAssignee] = useState<string>(ticket.assignee ? String(ticket.assignee.id) : UNASSIGNED);

  const changes: TicketChanges = {};
  if (status !== ticket.status) changes.status = status;
  const currentAssignee = ticket.assignee ? String(ticket.assignee.id) : UNASSIGNED;
  if (assignee !== currentAssignee) changes.assigneeId = assignee === UNASSIGNED ? null : Number(assignee);
  const dirty = Object.keys(changes).length > 0;

  // Make sure the current assignee is selectable even before (or if) the user list fails to load.
  const assigneeOptions = users ?? (ticket.assignee ? [ticket.assignee] : []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (dirty) onSubmit(changes);
  }

  return (
    <form className="update-form" onSubmit={handleSubmit} aria-label="Update ticket">
      <label>
        Status
        <select value={status} disabled={disabled} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assignee
        <select value={assignee} disabled={disabled || (!users && !usersError)} onChange={(e) => setAssignee(e.target.value)}>
          <option value={UNASSIGNED}>Unassigned</option>
          {assigneeOptions.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button type="submit" disabled={disabled || !dirty}>
          Save changes
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setStatus(ticket.status);
            setAssignee(currentAssignee);
          }}
        >
          Discard
        </button>
      </div>
    </form>
  );
}
