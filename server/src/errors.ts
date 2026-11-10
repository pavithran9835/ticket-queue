import type { ErrorRequestHandler, RequestHandler } from "express";

/** An error that maps directly to a JSON error response: { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFoundRoute: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `No route for ${req.method} ${req.originalUrl.split("?")[0]}`));
};

/** Responds 405 with an Allow header for methods a route does not support. */
export const methodNotAllowed =
  (...allowed: string[]): RequestHandler =>
  (req, res, next) => {
    res.set("Allow", allowed.join(", "));
    next(new ApiError(405, "METHOD_NOT_ALLOWED", `${req.method} is not supported here; use ${allowed.join(" or ")}`));
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
    return;
  }
  // body-parser errors (malformed JSON, payload too large, ...) carry a 4xx status and a type.
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    const code =
      err.type === "entity.parse.failed" ? "INVALID_JSON" : err.type === "entity.too.large" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST";
    const message = err.type === "entity.parse.failed" ? "Request body is not valid JSON" : err.message;
    res.status(err.status).json({ error: { code, message } });
    return;
  }
  // Unexpected: log the detail server-side, never leak it to the client.
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
};
