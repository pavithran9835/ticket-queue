import express from "express";
import type { Db } from "./db.js";
import { errorHandler, notFoundRoute } from "./errors.js";
import { ticketsRouter } from "./routes/tickets.js";
import { usersRouter } from "./routes/users.js";

export interface AppOptions {
  /** Log one line per request (disabled in tests). */
  logRequests?: boolean;
}

export function createApp(db: Db, options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  if (options.logRequests) {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
      });
      next();
    });
  }

  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get(); // proves the database is reachable, not just the process
    res.json({ status: "ok" });
  });

  app.use("/api/tickets", ticketsRouter(db));
  app.use("/api/users", usersRouter(db));

  app.use("/api", notFoundRoute);
  app.use(errorHandler);
  return app;
}
