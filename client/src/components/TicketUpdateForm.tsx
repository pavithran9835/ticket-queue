import { useState, type FormEvent } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_STATUSES,
  type TicketDetail,
  type TicketStatus,
  type UserSummary,
} from "../api/types";
import { Avatar } from "./Avatar";
import { PriorityIcon } from "./Icons";

export interface TicketChanges {
  status?: TicketStatus;
  assigneeId?: number | null;
}

interface Props {
  ticket: TicketDetail;
  users: UserSummary[] | undefined;
  usersError?: boolean;
  disabled: boolean;
  saving?: boolean;
  onSubmit: (changes: TicketChanges) => void;
}

const UNASSIGNED = "";

/**
 * Edits status and assignee. Only allowed status values are offered (mirrors the DB CHECK constraint);
 * only fields that actually changed are sent. The parent remounts this form (via `key`) whenever a new
 * version of the ticket is loaded, which resets the fields to the server's values.
 */
export function TicketUpdateForm({ ticket, users, usersError, disabled, saving, onSubmit }: Props) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignee, setAssignee] = useState<string>(ticket.assignee ? String(ticket.assignee.id) : UNASSIGNED);

  const changes: TicketChanges = {};
  if (status !== ticket.status) changes.status = status;
  const currentAssignee = ticket.assignee ? String(ticket.assignee.id) : UNASSIGNED;
  if (assignee !== currentAssignee) changes.assigneeId = assignee === UNASSIGNED ? null : Number(assignee);
  const dirty = Object.keys(changes).length > 0;

  // Make sure the current assignee is selectable even before (or if) the user list fails to load.
  const assigneeOptions = users ?? (ticket.assignee ? [ticket.assignee] : []);
  const selectedUser = assigneeOptions.find((u) => String(u.id) === assignee) ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (dirty) onSubmit(changes);
  }

  return (
    <form className="update-form" onSubmit={handleSubmit} aria-label="Update ticket">
      <div className="field-row">
        <label htmlFor="ticket-status">Status</label>
        <select
          id="ticket-status"
          className={`status-select status-${status}`}
          value={status}
          disabled={disabled}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <label htmlFor="ticket-assignee">Assignee</label>
        <div className="select-with-avatar">
          <Avatar user={selectedUser} />
          <select
            id="ticket-assignee"
            value={assignee}
            disabled={disabled || (!users && !usersError)}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value={UNASSIGNED}>Unassigned</option>
            {assigneeOptions.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <span className="field-label">Priority</span>
        <span className="priority">
          <PriorityIcon priority={ticket.priority} />
          {PRIORITY_LABELS[ticket.priority]}
        </span>
      </div>

      <div className="form-actions">
        <button type="submit" className="button primary" disabled={disabled || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="button subtle"
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
