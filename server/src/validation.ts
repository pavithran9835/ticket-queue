import { z } from "zod";
import { ApiError } from "./errors.js";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "./domain.js";

export const PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_MAX = 20;

/** Treat `?status=` (empty) the same as an omitted parameter. */
const optionalParam = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/** Positive integer from a query-string value; rejects "1.5", "abc", "1e3", " 2". */
const intParam = z
  .string()
  .regex(/^\d+$/, "must be a positive integer")
  .transform(Number)
  .pipe(z.number().int().min(1));

export const listTicketsQuerySchema = z
  .object({
    status: optionalParam(z.enum(TICKET_STATUSES)),
    priority: optionalParam(z.enum(TICKET_PRIORITIES)),
    q: optionalParam(z.string().trim().max(200)),
    page: optionalParam(intParam),
    pageSize: optionalParam(intParam.pipe(z.number().max(PAGE_SIZE_MAX))),
  })
  .strict() // unknown parameters (e.g. a typo like ?stauts=) are rejected rather than silently ignored
  .transform((v) => ({
    status: v.status,
    priority: v.priority,
    q: v.q === "" ? undefined : v.q, // whitespace-only search is "no search"
    page: v.page ?? 1,
    pageSize: v.pageSize ?? PAGE_SIZE_DEFAULT,
  }));

export type ListTicketsQuery = z.output<typeof listTicketsQuerySchema>;

export const ticketParamsSchema = z.object({ id: intParam });

export const updateTicketBodySchema = z
  .object({
    version: z.number().int().min(1),
    status: z.enum(TICKET_STATUSES).optional(),
    assigneeId: z.number().int().min(1).nullable().optional(), // null = unassign
  })
  .strict() // only status and assignee are editable; e.g. priority or title are rejected
  .refine((b) => b.status !== undefined || b.assigneeId !== undefined, {
    message: "Provide at least one of: status, assigneeId",
  });

export type UpdateTicketBody = z.output<typeof updateTicketBodySchema>;

/** Parses input or throws a 400 with field-level details. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown, what: string): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ApiError(
    400,
    "VALIDATION_ERROR",
    `Invalid ${what}`,
    result.error.issues.map((i) => ({
      field: i.path.join(".") || (i.code === "unrecognized_keys" ? i.keys.join(", ") : "(root)"),
      message: i.message,
    })),
  );
}
