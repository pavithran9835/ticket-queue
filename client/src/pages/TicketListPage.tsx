import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type ListTicketsParams,
  type TicketPriority,
  type TicketStatus,
} from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDateTime } from "../components/format";
import { useAsync } from "../hooks/useAsync";

const SEARCH_DEBOUNCE_MS = 300;

/** Filters live in the URL, so they survive a refresh and the back button. */
function readParams(sp: URLSearchParams): ListTicketsParams {
  const page = Number(sp.get("page"));
  return {
    status: (sp.get("status") || undefined) as TicketStatus | undefined,
    priority: (sp.get("priority") || undefined) as TicketPriority | undefined,
    q: sp.get("q") || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function TicketListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const params = readParams(searchParams);
  const { state, reload } = useAsync(
    (signal) => api.listTickets(params, signal),
    [params.status, params.priority, params.q, params.page],
  );

  /** Update one or more filters; any filter change goes back to page 1. */
  function setFilters(next: Partial<Record<"status" | "priority" | "q" | "page", string | undefined>>) {
    // Start from the live URL rather than the last rendered params: two quick changes (e.g. status then
    // priority before a re-render) would otherwise lose the first one.
    const sp = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    if (!("page" in next)) sp.delete("page");
    setSearchParams(sp);
  }

  // Search box: local state for typing, pushed to the URL after a short pause.
  const [searchText, setSearchText] = useState(params.q ?? "");
  useEffect(() => setSearchText(params.q ?? ""), [params.q]);
  useEffect(() => {
    if (searchText.trim() === (params.q ?? "")) return;
    const t = setTimeout(() => setFilters({ q: searchText.trim() || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const hasFilters = Boolean(params.status || params.priority || params.q);
  const result = state.data;

  return (
    <main>
      <h1>Ticket queue</h1>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Search titles
          <input
            type="search"
            value={searchText}
            placeholder="e.g. login"
            maxLength={200}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={params.status ?? ""} onChange={(e) => setFilters({ status: e.target.value || undefined })}>
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={params.priority ?? ""} onChange={(e) => setFilters({ priority: e.target.value || undefined })}>
            <option value="">All priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button type="button" onClick={() => setFilters({ status: undefined, priority: undefined, q: undefined })}>
            Clear filters
          </button>
        )}
      </form>

      {state.status === "error" && <ErrorMessage title="Could not load tickets." error={state.error} onRetry={reload} />}

      {state.status === "loading" && (
        <p className="message info" role="status">
          Loading tickets…
        </p>
      )}

      {state.status === "success" && result && result.data.length === 0 && (
        <div className="message info" role="status">
          {result.pagination.totalItems > 0 ? (
            <>
              This page is empty. <button onClick={() => setFilters({ page: undefined })}>Go to the first page</button>
            </>
          ) : hasFilters ? (
            <>
              No tickets match these filters.{" "}
              <button onClick={() => setFilters({ status: undefined, priority: undefined, q: undefined })}>
                Clear filters
              </button>
            </>
          ) : (
            "There are no tickets yet."
          )}
        </div>
      )}

      {result && result.data.length > 0 && state.status !== "error" && (
        <>
          <table aria-busy={state.status === "loading"} className={state.status === "loading" ? "stale" : undefined}>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Assignee</th>
                <th scope="col">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>
                    <Link to={`/tickets/${t.id}`} state={{ listSearch: location.search }}>
                      {t.title}
                    </Link>
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{t.assignee?.name ?? <em>Unassigned</em>}</td>
                  <td>
                    <time dateTime={t.updatedAt} title={t.updatedAt}>
                      {formatDateTime(t.updatedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination" aria-label="Pagination">
            <button
              disabled={result.pagination.page <= 1 || state.status === "loading"}
              onClick={() => setFilters({ page: String(result.pagination.page - 1) })}
            >
              ← Previous
            </button>
            <span>
              Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.totalItems} tickets
            </span>
            <button
              disabled={result.pagination.page >= result.pagination.totalPages || state.status === "loading"}
              onClick={() => setFilters({ page: String(result.pagination.page + 1) })}
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
