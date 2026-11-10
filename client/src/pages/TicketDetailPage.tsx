import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ConflictDetails } from "../api/types";
import { Avatar } from "../components/Avatar";
import { ConflictNotice } from "../components/ConflictNotice";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDateTime, formatRelative } from "../components/format";
import { SuccessIcon, TicketIcon } from "../components/Icons";
import { TicketUpdateForm, type TicketChanges } from "../components/TicketUpdateForm";
import { useAsync } from "../hooks/useAsync";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; error: Error }
  | { kind: "conflict"; details: ConflictDetails; attempted: TicketChanges };

export function TicketDetailPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const backTo = `/${(location.state as { listSearch?: string } | null)?.listSearch ?? ""}`;

  const ticket = useAsync((signal) => api.getTicket(id, signal), [id]);
  const users = useAsync((signal) => api.listUsers(signal), []);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  async function handleSave(changes: TicketChanges) {
    const current = ticket.state.data;
    if (!current) return;
    setSave({ kind: "saving" });
    try {
      // Send the version we loaded; the server rejects the write if the ticket has changed since.
      const updated = await api.updateTicket(id, { version: current.version, ...changes });
      ticket.setState({ status: "success", data: updated });
      setSave({ kind: "saved" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.details) {
        setSave({ kind: "conflict", details: error.details as ConflictDetails, attempted: changes });
      } else {
        setSave({ kind: "error", error: error as Error });
      }
    }
  }

  function reloadLatest() {
    setSave({ kind: "idle" });
    ticket.reload();
  }

  const t = ticket.state.data;
  const loading = ticket.state.status === "loading";

  return (
    <main className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={backTo}>Tickets</Link>
        <span aria-hidden>/</span>
        <span className="breadcrumb-key">
          <TicketIcon className="key-icon" width={14} height={14} />#{Number.isInteger(id) ? id : "?"}
        </span>
      </nav>

      {loading && !t && (
        <>
          <span className="visually-hidden" role="status">
            Loading ticket…
          </span>
          <div className="skeleton skeleton-title" aria-hidden />
          <div className="skeleton skeleton-block" aria-hidden />
        </>
      )}
      {ticket.state.status === "error" && (
        <ErrorMessage
          title="Could not load the ticket."
          error={ticket.state.error}
          onRetry={ticket.state.error instanceof ApiError && ticket.state.error.status === 404 ? undefined : ticket.reload}
        />
      )}

      {t && ticket.state.status !== "error" && (
        <div className="issue-layout" aria-busy={loading}>
          <article className="issue-main">
            <h1 className="issue-heading">{t.title}</h1>

            {save.kind === "conflict" && (
              <ConflictNotice
                details={save.details}
                loaded={t}
                attempted={save.attempted}
                users={users.state.data}
                onReload={reloadLatest}
                reloading={loading}
              />
            )}

            <section className="issue-section">
              <h2>Description</h2>
              <p className="description">{t.description}</p>
            </section>

            <section className="issue-section">
              <h2>
                Comments <span className="count-badge">{t.comments.length}</span>
              </h2>
              {t.comments.length === 0 ? (
                <p className="muted">No comments on this ticket.</p>
              ) : (
                <ol className="comments">
                  {t.comments.map((c) => (
                    <li key={c.id} className="comment">
                      <Avatar user={c.author} size="medium" />
                      <div>
                        <div className="comment-meta">
                          <strong>{c.author.name}</strong>
                          <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)} className="muted">
                            {formatDateTime(c.createdAt)}
                          </time>
                        </div>
                        <p>{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </article>

          <aside className="issue-sidebar">
            <section className="panel">
              <h2 className="panel-title">Details</h2>
              {users.state.status === "error" && (
                <ErrorMessage title="Could not load assignees." error={users.state.error} onRetry={users.reload} />
              )}
              <TicketUpdateForm
                key={`${t.id}-${t.version}`}
                ticket={t}
                users={users.state.data}
                usersError={users.state.status === "error"}
                disabled={save.kind === "saving" || save.kind === "conflict" || loading}
                saving={save.kind === "saving"}
                onSubmit={handleSave}
              />
              {save.kind === "saved" && (
                <div className="section-message success compact" role="status">
                  <SuccessIcon className="section-message-icon" />
                  <div className="section-message-body">Changes saved (now version {t.version}).</div>
                </div>
              )}
              {save.kind === "error" && <ErrorMessage title="Your changes were not saved." error={save.error} />}

              <dl className="detail-fields">
                <dt>Ticket ID</dt>
                <dd>{t.id}</dd>
                <dt>Created</dt>
                <dd>
                  <time dateTime={t.createdAt} title={formatDateTime(t.createdAt)}>
                    {formatDateTime(t.createdAt)}
                  </time>
                </dd>
                <dt>Last updated</dt>
                <dd>
                  <time dateTime={t.updatedAt} title={formatRelative(t.updatedAt)}>
                    {formatDateTime(t.updatedAt)}
                  </time>
                </dd>
                <dt>Version</dt>
                <dd>{t.version}</dd>
              </dl>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
