import { ApiError } from "../api/client";
import type { FieldError } from "../api/types";

/** Shows an API/network error, including field-level validation details when present. */
export function ErrorMessage({ error, onRetry, title }: { error: Error; onRetry?: () => void; title?: string }) {
  const fieldErrors = error instanceof ApiError && Array.isArray(error.details) ? (error.details as FieldError[]) : [];
  return (
    <div className="message error" role="alert">
      {title && <strong>{title} </strong>}
      {error.message}
      {fieldErrors.length > 0 && (
        <ul>
          {fieldErrors.map((d, i) => (
            <li key={i}>
              <code>{d.field}</code>: {d.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
