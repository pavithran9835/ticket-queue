import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { STATUS_LABELS, TICKET_STATUSES } from "../api/types";
import { ListIcon, TicketIcon } from "./Icons";

/** Top navigation bar + left sidebar around every page. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const currentStatus = pathname === "/" ? new URLSearchParams(search).get("status") : null;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <TicketIcon className="brand-icon" width={22} height={22} />
          <span>Ticket Queue</span>
        </Link>
        <nav className="topbar-nav" aria-label="Primary">
          <NavLink
            to="/"
            className={() => `topbar-link${pathname === "/" || pathname.startsWith("/tickets/") ? " active" : ""}`}
          >
            Tickets
          </NavLink>
        </nav>
      </header>

      <aside className="sidebar" aria-label="Queues">
        <div className="sidebar-project">
          <span className="project-avatar" aria-hidden>
            SP
          </span>
          <div>
            <div className="project-name">Support</div>
            <div className="project-type">Service project</div>
          </div>
        </div>
        <div className="sidebar-heading">Queues</div>
        <Link to="/" className={`sidebar-link${pathname === "/" && !currentStatus ? " active" : ""}`}>
          <ListIcon /> All tickets
        </Link>
        {TICKET_STATUSES.map((s) => (
          <Link
            key={s}
            to={`/?status=${s}`}
            className={`sidebar-link${currentStatus === s ? " active" : ""}`}
          >
            <span className={`dot status-${s}`} aria-hidden /> {STATUS_LABELS[s]}
          </Link>
        ))}
      </aside>

      <div className="content">{children}</div>
    </div>
  );
}
