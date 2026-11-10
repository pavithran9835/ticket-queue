import { PRIORITY_LABELS, STATUS_LABELS, type TicketPriority, type TicketStatus } from "../api/types";
import { PriorityIcon } from "./Icons";

/** Status lozenge (small uppercase pill coloured by workflow stage). */
export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`lozenge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className="priority">
      <PriorityIcon priority={priority} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
