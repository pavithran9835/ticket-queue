import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ConflictDetails } from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { ConflictNotice } from "../components/ConflictNotice";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDateTime } from "../components/format";
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
    <main>
      <p>
        <Link to={backTo}>← Back to tickets</Link>
      </p>

      {loading && !t && (
        <p className="message info" role="status">
          Loading ticket…
        </p>
      )}
      {ticket.state.status === "error" && (
        <ErrorMessage
          title="Could not load the ticket."
          error={ticket.state.error}
          onRetry={ticket.state.error instanceof ApiError && ticket.state.error.status === 404 ? undefined : ticket.reload}
        />
      )}

      {t && ticket.state.status !== "error" && (
        <article aria-busy={loading}>
          <h1>
            #{t.id} {t.title}
          </h1>

          <dl className="ticket-fields">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={t.status} />
            </dd>
            <dt>Priority</dt>
            <dd>
              <PriorityBadge priority={t.priority} />
            </dd>
            <dt>Assignee</dt>
            <dd>{t.assignee?.name ?? <em>Unassigned</em>}</dd>
            <dt>Created</dt>
            <dd>
              <time dateTime={t.createdAt} title={t.createdAt}>
                {formatDateTime(t.createdAt)}
              </time>
            </dd>
            <dt>Last updated</dt>
            <dd>
              <time dateTime={t.updatedAt} title={t.updatedAt}>
                {formatDateTime(t.updatedAt)}
              </time>
            </dd>
            <dt>Version</dt>
            <dd>{t.version}</dd>
          </dl>

          <section>
            <h2>Description</h2>
            <p className="description">{t.description}</p>
          </section>

          <section>
            <h2>Update</h2>
            {users.state.status === "error" && (
              <ErrorMessage title="Could not load assignees." error={users.state.error} onRetry={users.reload} />
            )}
            <TicketUpdateForm
              key={`${t.id}-${t.version}`}
              ticket={t}
              users={users.state.data}
              usersError={users.state.status === "error"}
              disabled={save.kind === "saving" || save.kind === "conflict" || loading}
              onSubmit={handleSave}
            />
            {save.kind === "saving" && (
              <p className="message info" role="status">
                Saving…
              </p>
            )}
            {save.kind === "saved" && (
              <p className="message success" role="status">
                Changes saved (now version {t.version}).
              </p>
            )}
            {save.kind === "error" && <ErrorMessage title="Your changes were not saved." error={save.error} />}
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
          </section>

          <section>
            <h2>Comments ({t.comments.length})</h2>
            {t.comments.length === 0 ? (
              <p className="muted">No comments on this ticket.</p>
            ) : (
              <ol className="comments">
                {t.comments.map((c) => (
                  <li key={c.id}>
                    <div className="comment-meta">
                      <strong>{c.author.name}</strong> ·{" "}
                      <time dateTime={c.createdAt} title={c.createdAt}>
                        {formatDateTime(c.createdAt)}
                      </time>
                    </div>
                    <p>{c.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </article>
      )}
    </main>
  );
}
