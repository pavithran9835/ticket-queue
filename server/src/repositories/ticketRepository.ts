import type { Db } from "../db.js";
import type { Paginated, TicketComment, TicketDetail, TicketListItem, TicketPriority, TicketStatus } from "../domain.js";
import type { ListTicketsQuery } from "../validation.js";

/*
 * All SQL here is static text with bound parameters. No user input is ever concatenated into SQL;
 * optional filters use the "(@param IS NULL OR column = @param)" pattern instead of building WHERE clauses.
 */

interface TicketRow {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  version: number;
  created_at: string;
  updated_at: string;
  assignee_id: number | null;
  assignee_name: string | null;
}

const assigneeOf = (r: Pick<TicketRow, "assignee_id" | "assignee_name">) =>
  r.assignee_id === null ? null : { id: r.assignee_id, name: r.assignee_name ?? "" };

/** Escapes LIKE wildcards so a search for "50%" or "a_b" matches those characters literally. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const LIST_FILTER = `
  WHERE (@status IS NULL OR t.status = @status)
    AND (@priority IS NULL OR t.priority = @priority)
    AND (@pattern IS NULL OR t.title LIKE @pattern ESCAPE '\\')`;

export function listTickets(db: Db, query: ListTicketsQuery): Paginated<TicketListItem> {
  const params = {
    status: query.status ?? null,
    priority: query.priority ?? null,
    pattern: query.q ? `%${escapeLike(query.q)}%` : null, // LIKE is case-insensitive for ASCII in SQLite
  };

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM tickets t ${LIST_FILTER}`).get(params) as { total: number };

  const rows = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.updated_at, t.assignee_id, u.name AS assignee_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assignee_id
       ${LIST_FILTER}
       ORDER BY t.updated_at DESC, t.id DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: query.pageSize, offset: (query.page - 1) * query.pageSize }) as TicketRow[];

  return {
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      assignee: assigneeOf(r),
      updatedAt: r.updated_at,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/** Returns the full ticket with its comments (2 queries, no N+1), or undefined if it does not exist. */
export function getTicket(db: Db, id: number): TicketDetail | undefined {
  const row = db
    .prepare(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.version, t.created_at, t.updated_at,
              t.assignee_id, u.name AS assignee_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.id = ?`,
    )
    .get(id) as TicketRow | undefined;
  if (!row) return undefined;

  const comments = db
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.id AS author_id, u.name AS author_name
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.ticket_id = ?
       ORDER BY c.created_at, c.id`,
    )
    .all(id) as { id: number; body: string; created_at: string; author_id: number; author_name: string }[];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: assigneeOf(row),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments: comments.map(
      (c): TicketComment => ({
        id: c.id,
        body: c.body,
        author: { id: c.author_id, name: c.author_name },
        createdAt: c.created_at,
      }),
    ),
  };
}
