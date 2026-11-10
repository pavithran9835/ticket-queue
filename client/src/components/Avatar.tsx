import type { UserSummary } from "../api/types";

const COLORS = ["#0c66e4", "#6e5dc6", "#1f845a", "#c9372c", "#e56910", "#227d9b"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Initials avatar. The initials are drawn with CSS (`data-initials`), so they are not part of the
 * element's text: screen readers and tests read just the person's name next to it.
 */
export function Avatar({ user, size = "small" }: { user: UserSummary | null; size?: "small" | "medium" }) {
  if (!user) return <span className={`avatar avatar-${size} avatar-empty`} aria-hidden />;
  return (
    <span
      className={`avatar avatar-${size}`}
      data-initials={initials(user.name)}
      style={{ background: COLORS[user.id % COLORS.length] }}
      aria-hidden
    />
  );
}

/** Avatar followed by the name ("Unassigned" when there is no user). */
export function UserLabel({ user }: { user: UserSummary | null }) {
  return (
    <span className="user-label">
      <Avatar user={user} />
      {user ? user.name : <span className="muted">Unassigned</span>}
    </span>
  );
}
