# Ticket Queue

A small full-stack ticket queue: find tickets, inspect them, and change their status and assignee, with protection
against lost updates when two people edit the same ticket.

- **Front end:** React 19 + React Router, Vite, TypeScript (`client/`)
- **Back end:** Node.js + Express 5, TypeScript, better-sqlite3, zod (`server/`)
- **Data:** the supplied SQLite file, used directly (`data/ticket-assessment-data.sqlite`, unchanged)
- **API docs:** [`docs/API.md`](docs/API.md)

## Prerequisites

- **Node.js 22.12 or newer** (developed on 22.14; `.nvmrc` provided). This floor comes from Vitest and better-sqlite3.
- npm 10+
- No separate SQLite installation is needed: better-sqlite3 ships prebuilt binaries for macOS, Linux and Windows.

## Setup and run

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:5173**. `npm run dev` starts the API on port 3001 and the Vite dev server on 5173, which
proxies `/api` to the API. Use `API_PORT=4000 npm run dev` if 3001 is taken.

On first start the API copies the supplied database to `data/tickets.dev.sqlite` (git-ignored) and works on that
copy, so the supplied file is never modified. To return to the original seed data at any time:

```bash
npm run db:reset
```

## Tests

```bash
npm test
```

This runs both suites (about 50 tests, a few seconds):

- **API** (`server/tests`, Vitest + Supertest): every test runs against its own temporary copy of the database,
  and every test's cleanup asserts the supplied file's SHA-256 is unchanged.
  - `read.test.ts`: listing, filters, search (including literal `%`/`_`), pagination, detail and comments, users,
    validation errors, and the enum values matching the schema's CHECK constraints.
  - `update.test.ts`: the success path, partial updates, **the stale-update conflict path (client read v3, DB
    at v4 → 409)**, a change made through another DB connection, **a true race between 4 OS processes holding the
    same version (exactly one wins)**, plus 400/404/405/413/415/422.
- **UI** (`client/src`, Vitest + Testing Library, `fetch` mocked): list states, URL filters, save, validation error,
  and the 409 conflict → "Reload latest ticket" flow.

Run one suite with `npm test -w server` or `npm test -w client`. `npm run typecheck` type-checks both packages.

## Project structure

```
data/ticket-assessment-data.sqlite   supplied database (unchanged)
docs/API.md                          REST API documentation
server/src/
  app.ts                             Express app factory (used by index.ts and the tests)
  index.ts                           starts the API on API_PORT (default 3001)
  config.ts, db.ts                   paths, opening SQLite (foreign_keys ON), working-copy handling
  domain.ts                          status/priority enums and API response types
  validation.ts                      zod schemas for query, path and body
  errors.ts                          ApiError, JSON error handler, 404/405 helpers
  routes/tickets.ts, routes/users.ts HTTP layer: parse → repository → status code
  repositories/                      all SQL (static, parameterised)
server/tests/                        API tests
client/src/
  api/                               typed fetch client + types
  hooks/useAsync.ts                  data loading with request cancellation
  pages/TicketListPage.tsx           list, filters, search, pagination
  pages/TicketDetailPage.tsx         detail, comments, save flow
  components/                        update form, conflict notice, error message, badges
```

## Main design decisions

**Optimistic concurrency is done in one SQL statement.** The client sends back the `version` it read. The server runs:

```sql
UPDATE tickets SET ..., version = version + 1, updated_at = @now
WHERE id = @id AND version = @expectedVersion
```

The version check and the write are the same atomic statement, so there is no window between "check" and "write".
If it changes 0 rows, the server works out (inside the same `BEGIN IMMEDIATE` transaction) whether the ticket is
missing (404) or stale (409). The 409 body contains `yourVersion`, `currentVersion` and the current ticket.
A test races 4 separate processes, each with its own connection, to prove exactly one wins.

**Partial updates cannot clobber each other's fields.** Only the fields that are sent are written
(`CASE WHEN @setStatus THEN @status ELSE status END`), so a status-only save never overwrites an assignee.

**Version in the body rather than ETag/If-Match.** Both are allowed by the brief. A body field is explicit, visible
in the API docs and easy to test. 409 Conflict is used (state conflict) rather than 412 (which pairs with `If-Match`).

**Validation at the edge, the database as a backstop.** zod validates query, path and body: enums, strict integers,
unknown fields rejected, `priority`/`title` not editable. Inside the database, the CHECK constraints and
`PRAGMA foreign_keys = ON` (SQLite's default is off) guard against anything that slips past.

**Safe SQL.** All statements are static strings with named parameters. Optional filters use
`(@status IS NULL OR status = @status)` instead of building WHERE clauses, and LIKE wildcards in the search term are
escaped. Detail and comments are fetched with JOINs (2 queries, no N+1).

**API returns what the client needs.** camelCase DTOs with nested `assignee`/`author` objects. No `assignee_id`,
`ticket_id` or user emails. `version` is exposed on the detail endpoint because the client needs it to update.

**UI state.** Filters, search and page live in the URL, so they survive refresh and the back button. Stale requests are
aborted. On a 409 the UI says clearly that nothing was saved, shows the user's change next to the latest values,
disables the form, and offers "Reload latest ticket", which refetches the ticket and resets the form.

**SQLite access is synchronous (better-sqlite3).** For a single-process API on a local SQLite file this is simple,
fast and makes transactions straightforward.

## Assumptions

- Only **status** and **assignee** are editable, as the brief lists. Priority is shown and filterable but not editable.
- A ticket can be unassigned (`assignee_id` is nullable, 6 seeded tickets have none). "Unassigned Queue" (user 5) is
  treated as an ordinary user that tickets can be assigned to, separate from "no assignee".
- The list is ordered by last update, newest first. Updating a ticket moves it to the top.
- Page size defaults to 10, maximum 20. A page past the end returns 200 with an empty list.
- Every successful save increments the version, even if the values are unchanged (the UI only enables Save when
  something changed).
- `updated_at` is written in the same format as the seed data (`YYYY-MM-DDTHH:MM:SSZ`). The UI shows times in the
  viewer's local time zone, with the raw UTC value in a tooltip.
- Search is a case-insensitive substring match on the title only (SQLite `LIKE`, ASCII case folding).

## Shortcuts taken

- No authentication. Anyone can edit any ticket, and there is no "who changed it" record (the brief excludes auth).
- The status/priority enums are duplicated in the client (`client/src/api/types.ts`) instead of being served by the API.
  The server copy is checked against the database schema by a test, but the client copy is not.
- Search uses `LIKE '%term%'`, which cannot use an index. That's fine for 30 rows, not for a large table.
- No production build or serving setup. Only the dev servers are configured (deployment was out of scope).
- The UI is styled like a typical issue tracker (top bar, queue sidebar, issue table, details panel) using plain CSS
  with design tokens in `client/src/styles.css`, with no UI component library to keep dependencies small. It is
  desktop-first; below 960px the sidebar hides and the detail columns stack, but mobile was out of scope.
- Native `<select>` elements are used for status and assignee (accessible and keyboard-friendly) rather than
  custom dropdowns with avatars inside the options.

## What I would improve with more time

- Return an `ETag` header on GET and accept `If-Match` as well, so generic HTTP clients and caches get standard semantics.
- A three-way merge in the conflict UI: keep the user's change when it doesn't overlap the other user's change
  ("Reload and re-apply my change" in one click).
- Serve the enums (or an OpenAPI spec) from the API and generate client types from it, removing the duplication.
- SQLite FTS5 for title search, and composite indexes for filter + sort as the data grows.
- An audit trail (who changed what and when) and adding comments from the UI.
- End-to-end browser tests (Playwright) for the two-tab conflict scenario. It is currently verified manually and with
  component tests.
- Structured logging with request IDs, and a production build served by Express.

## Time spent

**Approximately 1 hour** in total, including reading the brief, building, reviewing and testing.

**Unfinished work:** none of the required or intermediate items. Ideas beyond the brief are listed under
"What I would improve with more time".

## AI usage

See [`AI_USAGE.md`](AI_USAGE.md).
