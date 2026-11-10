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
import { UserLabel } from "../components/Avatar";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDate, formatDateTime, formatRelative } from "../components/format";
import { ChevronLeft, ChevronRight, EmptyIllustration, SearchIcon } from "../components/Icons";
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
  const clearFilters = () => setFilters({ status: undefined, priority: undefined, q: undefined });

  return (
    <main className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>Support</span>
        <span aria-hidden>/</span>
        <span>Queues</span>
      </nav>
      <div className="page-header">
        <h1 className="page-title">{params.status ? `${STATUS_LABELS[params.status] ?? "All"} tickets` : "All tickets"}</h1>
        {result && <span className="count-badge">{result.pagination.totalItems}</span>}
      </div>

      <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="search-field">
          <span className="visually-hidden">Search titles</span>
          <SearchIcon className="search-icon" />
          <input
            type="search"
            value={searchText}
            placeholder="Search titles"
            maxLength={200}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </label>
        <label className="select-field">
          <span className="visually-hidden">Status</span>
          <select value={params.status ?? ""} onChange={(e) => setFilters({ status: e.target.value || undefined })}>
            <option value="">Status: All</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span className="visually-hidden">Priority</span>
          <select value={params.priority ?? ""} onChange={(e) => setFilters({ priority: e.target.value || undefined })}>
            <option value="">Priority: All</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="button subtle" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </form>

      {state.status === "error" && <ErrorMessage title="Could not load tickets." error={state.error} onRetry={reload} />}

      {state.status === "loading" && (
        <span className="visually-hidden" role="status">
          Loading tickets…
        </span>
      )}

      {state.status === "loading" && !result && <SkeletonTable />}

      {state.status === "success" && result && result.data.length === 0 && (
        <div className="empty-state" role="status">
          <EmptyIllustration />
          {result.pagination.totalItems > 0 ? (
            <>
              <h2>This page is empty</h2>
              <button className="button" onClick={() => setFilters({ page: undefined })}>
                Go to the first page
              </button>
            </>
          ) : hasFilters ? (
            <>
              <h2>No tickets match these filters</h2>
              <p>Try a different search term or remove some filters.</p>
              <button className="button" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          ) : (
            <h2>There are no tickets yet</h2>
          )}
        </div>
      )}

      {result && result.data.length > 0 && state.status !== "error" && (
        <div className="table-card">
          <table className={`issue-table${state.status === "loading" ? " stale" : ""}`} aria-busy={state.status === "loading"}>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col" className="issue-title">Title</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Assignee</th>
                <th scope="col">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td className="issue-key">#{t.id}</td>
                  <td className="issue-title">
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
                  <td>
                    <UserLabel user={t.assignee} />
                  </td>
                  <td className="muted">
                    <time dateTime={t.updatedAt} title={`${formatDateTime(t.updatedAt)} (${formatRelative(t.updatedAt)})`}>
                      {formatDate(t.updatedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination" aria-label="Pagination">
            <span className="muted">
              {(result.pagination.page - 1) * result.pagination.pageSize + 1}–
              {(result.pagination.page - 1) * result.pagination.pageSize + result.data.length} of{" "}
              {result.pagination.totalItems}
            </span>
            <div className="pagination-controls">
              <button
                className="button subtle icon-button"
                aria-label="Previous page"
                disabled={result.pagination.page <= 1 || state.status === "loading"}
                onClick={() => setFilters({ page: String(result.pagination.page - 1) })}
              >
                <ChevronLeft />
              </button>
              <span>
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <button
                className="button subtle icon-button"
                aria-label="Next page"
                disabled={result.pagination.page >= result.pagination.totalPages || state.status === "loading"}
                onClick={() => setFilters({ page: String(result.pagination.page + 1) })}
              >
                <ChevronRight />
              </button>
            </div>
          </nav>
        </div>
      )}
    </main>
  );
}

/** Placeholder rows shown on first load, so the layout does not jump. */
function SkeletonTable() {
  return (
    <div className="table-card" aria-hidden>
      <table className="issue-table">
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i}>
              {[40, 320, 80, 90, 120, 90].map((w, j) => (
                <td key={j}>
                  <span className="skeleton" style={{ width: w }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
