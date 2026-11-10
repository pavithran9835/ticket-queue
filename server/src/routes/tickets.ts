import { Router } from "express";
import type { Db } from "../db.js";
import { ApiError, methodNotAllowed } from "../errors.js";
import { getTicket, listTickets, updateTicket } from "../repositories/ticketRepository.js";
import { listTicketsQuerySchema, parseOrThrow, ticketParamsSchema, updateTicketBodySchema } from "../validation.js";

export function ticketsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const query = parseOrThrow(listTicketsQuerySchema, req.query, "query parameters");
    res.json(listTickets(db, query));
  });

  router.get("/:id", (req, res) => {
    const { id } = parseOrThrow(ticketParamsSchema, req.params, "ticket id");
    const ticket = getTicket(db, id);
    if (!ticket) throw new ApiError(404, "TICKET_NOT_FOUND", `Ticket ${id} does not exist`);
    res.json({ data: ticket });
  });

  /**
   * PATCH /api/tickets/:id  body: { version, status?, assigneeId? }
   * `version` is the value the client last read; the update is rejected with 409 if the ticket has moved on.
   */
  router.patch("/:id", (req, res) => {
    const { id } = parseOrThrow(ticketParamsSchema, req.params, "ticket id");
    if (!req.is("application/json")) {
      throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Request body must be JSON (Content-Type: application/json)");
    }
    const body = parseOrThrow(updateTicketBodySchema, req.body, "request body");

    const result = updateTicket(db, id, body.version, { status: body.status, assigneeId: body.assigneeId });
    switch (result.kind) {
      case "updated":
        res.json({ data: result.ticket });
        return;
      case "not_found":
        throw new ApiError(404, "TICKET_NOT_FOUND", `Ticket ${id} does not exist`);
      case "unknown_assignee":
        // Well-formed but refers to nothing -> 422. The FK constraint is the database-level backstop.
        throw new ApiError(422, "UNKNOWN_ASSIGNEE", `User ${body.assigneeId} does not exist`, [
          { field: "assigneeId", message: "must be the id of an existing user, or null to unassign" },
        ]);
      case "conflict":
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          `Ticket ${id} was changed by someone else after you loaded it (you have version ${body.version}, ` +
            `the latest is version ${result.current.version}). Your changes were not saved. ` +
            `Reload the ticket and apply your changes again.`,
          { yourVersion: body.version, currentVersion: result.current.version, currentTicket: result.current },
        );
    }
  });

  router.all("/", methodNotAllowed("GET"));
  router.all("/:id", methodNotAllowed("GET", "PATCH"));
  return router;
}
