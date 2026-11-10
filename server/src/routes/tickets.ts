import { Router } from "express";
import type { Db } from "../db.js";
import { ApiError } from "../errors.js";
import { getTicket, listTickets } from "../repositories/ticketRepository.js";
import { listTicketsQuerySchema, parseOrThrow, ticketParamsSchema } from "../validation.js";

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

  return router;
}
