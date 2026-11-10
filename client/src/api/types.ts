// Shapes returned by the REST API (see docs/API.md).

export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export interface UserSummary {
  id: number;
  name: string;
}

export interface TicketListItem {
  id: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: UserSummary | null;
  updatedAt: string;
}

export interface TicketComment {
  id: number;
  body: string;
  author: UserSummary;
  createdAt: string;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  version: number;
  createdAt: string;
  comments: TicketComment[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  pagination: Pagination;
}

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  q?: string;
  page?: number;
}

export interface TicketUpdate {
  version: number;
  status?: TicketStatus;
  assigneeId?: number | null;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ConflictDetails {
  yourVersion: number;
  currentVersion: number;
  currentTicket: TicketDetail;
}
