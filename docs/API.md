# Ticket Queue REST API

Base URL: `http://localhost:3001/api` (in development the React app calls `/api/...` on its own origin and Vite proxies it).

All responses are JSON. Field names are camelCase. Timestamps are ISO 8601 UTC strings (`2026-10-01T18:30:00Z`).

## Error format

Every error response has the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [{ "field": "status", "message": "Invalid option: expected one of \"open\"|\"in_progress\"|\"resolved\"" }]
  }
}
```

`details` is optional. For validation errors it is a list of `{ field, message }`; for `VERSION_CONFLICT` it is an object (see below).

| Status | `code` | When |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | Invalid query/path parameter or request body (unknown fields included) |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 404 | `TICKET_NOT_FOUND` | Ticket id does not exist |
| 404 | `ROUTE_NOT_FOUND` | Unknown `/api` path |
| 405 | `METHOD_NOT_ALLOWED` | Method not supported on the resource (`Allow` header lists the supported ones) |
| 409 | `VERSION_CONFLICT` | The ticket changed since the client read it (optimistic concurrency) |
| 413 | `PAYLOAD_TOO_LARGE` | Body larger than 10 kB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `PATCH` body is not `application/json` |
| 422 | `UNKNOWN_ASSIGNEE` | `assigneeId` does not refer to an existing user |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details are logged server-side, never returned) |

## Enumerations

These mirror the `CHECK` constraints in the database. Any other value is rejected with 400.

- `status`: `open`, `in_progress`, `resolved`
- `priority`: `low`, `medium`, `high`, `critical`

---

## `GET /api/tickets`

List tickets, most recently updated first (`updatedAt` desc, then `id` desc).

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| `status` | enum | — | Exact match |
| `priority` | enum | — | Exact match |
| `q` | string (≤ 200 chars) | — | Case-insensitive substring match on the title. `%`, `_` and `\` are matched literally. Leading/trailing spaces are trimmed. |
| `page` | integer ≥ 1 | `1` | A page past the end returns an empty `data` array |
| `pageSize` | integer 1–20 | `10` | |

Empty parameters (`?status=`) are treated as omitted. Unknown parameters are rejected with 400.

**200**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Login page loops after password reset",
      "status": "in_progress",
      "priority": "critical",
      "assignee": { "id": 2, "name": "Daniel Tan" },
      "updatedAt": "2026-10-01T18:30:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1 }
}
```

`assignee` is `null` for unassigned tickets.

Example: `GET /api/tickets?status=open&priority=high&q=login&page=1&pageSize=10`

---

## `GET /api/tickets/:id`

The complete ticket with its comments (oldest first).

**200**

```json
{
  "data": {
    "id": 4,
    "title": "Search results show duplicate records",
    "description": "Reproduce the issue, ...",
    "status": "in_progress",
    "priority": "low",
    "assignee": { "id": 1, "name": "Asha Rao" },
    "version": 2,
    "createdAt": "2026-10-02T12:30:00Z",
    "updatedAt": "2026-10-03T00:30:00Z",
    "comments": [
      {
        "id": 2,
        "body": "Initial investigation completed; further validation is required.",
        "author": { "id": 2, "name": "Daniel Tan" },
        "createdAt": "2026-10-03T00:55:00Z"
      }
    ]
  }
}
```

`version` is the concurrency token. Send it back unchanged when updating.

Errors: 400 (id is not a positive integer), 404.

---

## `GET /api/users`

Candidate assignees, sorted by name.

**200**

```json
{ "data": [{ "id": 1, "name": "Asha Rao" }, { "id": 2, "name": "Daniel Tan" }] }
```

---

## `PATCH /api/tickets/:id`

Change a ticket's status and/or assignee. Uses optimistic concurrency: the update only applies if the ticket is still
at the `version` the client read.

Request (`Content-Type: application/json`):

```json
{ "version": 3, "status": "resolved", "assigneeId": 2 }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `version` | integer ≥ 1 | yes | The `version` from the client's last `GET` |
| `status` | enum | one of `status` / `assigneeId` | |
| `assigneeId` | integer ≥ 1 or `null` | one of `status` / `assigneeId` | `null` unassigns |

Only the fields that are sent are changed. Any other field (e.g. `priority`, `title`) is rejected with 400.
On success the version is incremented by 1 and `updatedAt` is set to the current UTC time.

**200**: the updated ticket, same shape as `GET /api/tickets/:id`.

**409**: the ticket was changed by someone else after the client read it. Nothing was written.

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Ticket 2 was changed by someone else after you loaded it (you have version 3, the latest is version 4). Your changes were not saved. Reload the ticket and apply your changes again.",
    "details": {
      "yourVersion": 3,
      "currentVersion": 4,
      "currentTicket": { "id": 2, "version": 4, "status": "resolved", "...": "full ticket as in GET" }
    }
  }
}
```

Other errors: 400 (validation), 404 (no such ticket), 415 (not JSON), 422 (`assigneeId` does not exist).

---

## `GET /api/health`

`200 {"status":"ok"}` when the process is up **and** the database answers a query.

## curl examples

```bash
curl -s 'localhost:3001/api/tickets?status=open&q=login'
curl -s localhost:3001/api/tickets/2
curl -s -X PATCH localhost:3001/api/tickets/2 -H 'Content-Type: application/json' -d '{"version":3,"status":"open"}'
# run the same PATCH again -> 409 VERSION_CONFLICT (version is now 4)
```
