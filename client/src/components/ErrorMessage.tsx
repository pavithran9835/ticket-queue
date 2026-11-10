import { ApiError } from "../api/client";
import type { FieldError } from "../api/types";
import { ErrorIcon } from "./Icons";

/** Shows an API/network error, including field-level validation details when present. */
export function ErrorMessage({ error, onRetry, title }: { error: Error; onRetry?: () => void; title?: string }) {
  const fieldErrors = error instanceof ApiError && Array.isArray(error.details) ? (error.details as FieldError[]) : [];
  return (
    <div className="section-message error" role="alert">
      <ErrorIcon className="section-message-icon" />
      <div className="section-message-body">
        {title && <strong className="section-message-title">{title} </strong>}
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
          <div className="section-message-actions">
            <button type="button" className="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
