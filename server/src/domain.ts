/** Mirrors the CHECK constraints on the tickets table (verified by a test against the schema). */
export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Public shapes returned by the API (camelCase, no internal columns such as assignee_id). */
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

export interface TicketDetail {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: UserSummary | null;
  /** Concurrency token: send it back unchanged when updating. */
  version: number;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
