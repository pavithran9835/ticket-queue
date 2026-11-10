import { PRIORITY_LABELS, STATUS_LABELS, type TicketPriority, type TicketStatus } from "../api/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>;
}
