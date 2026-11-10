import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../src/domain.js";
import { createTestContext } from "./helpers.js";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => (ctx = createTestContext()));
afterEach(() => ctx.cleanup());

describe("GET /api/tickets", () => {
  it("returns the first page with list fields and pagination metadata", async () => {
    const res = await request(ctx.app).get("/api/tickets").expect(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 30, totalPages: 3 });
    expect(res.body.data).toHaveLength(10);
    // exactly the fields the list needs; no raw DB columns such as assignee_id, description or version
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["assignee", "id", "priority", "status", "title", "updatedAt"]);
    // most recently updated first
    const times = res.body.data.map((t: { updatedAt: string }) => t.updatedAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("paginates without overlap and returns an empty page past the end", async () => {
    const ids = new Set<number>();
    for (const page of [1, 2, 3]) {
      const res = await request(ctx.app).get(`/api/tickets?page=${page}&pageSize=10`).expect(200);
      res.body.data.forEach((t: { id: number }) => ids.add(t.id));
    }
    expect(ids.size).toBe(30);
    const past = await request(ctx.app).get("/api/tickets?page=4").expect(200);
    expect(past.body.data).toEqual([]);
    expect(past.body.pagination.totalItems).toBe(30);
  });

  it("filters by status and priority on the server", async () => {
    const res = await request(ctx.app).get("/api/tickets?status=open&priority=high&pageSize=20").expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.totalItems).toBe(res.body.data.length);
    for (const t of res.body.data) {
      expect(t.status).toBe("open");
      expect(t.priority).toBe("high");
    }
    const expected = ctx.db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE status='open' AND priority='high'").get() as { n: number };
    expect(res.body.pagination.totalItems).toBe(expected.n);
  });

  it("searches titles case-insensitively", async () => {
    const res = await request(ctx.app).get("/api/tickets?q=LOGIN").expect(200);
    expect(res.body.data.map((t: { id: number }) => t.id)).toEqual([1]);
  });

  it("treats LIKE wildcards in the search term literally", async () => {
    for (const q of ["%", "_", "\\"]) {
      const res = await request(ctx.app).get("/api/tickets").query({ q }).expect(200);
      expect(res.body.pagination.totalItems).toBe(0);
    }
    // a title that does contain a special character is still found
    ctx.db.prepare("UPDATE tickets SET title = '100% CPU on worker_1' WHERE id = 3").run();
    const res = await request(ctx.app).get("/api/tickets").query({ q: "0% CPU on worker_" }).expect(200);
    expect(res.body.data.map((t: { id: number }) => t.id)).toEqual([3]);
  });

  it.each([
    ["status=closed", "status"],
    ["priority=urgent", "priority"],
    ["page=0", "page"],
    ["page=abc", "page"],
    ["pageSize=21", "pageSize"],
    ["stauts=open", "stauts"],
  ])("rejects invalid query %s with 400 and a JSON error", async (qs, field) => {
    const res = await request(ctx.app).get(`/api/tickets?${qs}`).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe(field);
  });
});

describe("GET /api/tickets/:id", () => {
  it("returns the complete ticket with its comments", async () => {
    const res = await request(ctx.app).get("/api/tickets/4").expect(200);
    const t = res.body.data;
    expect(t).toMatchObject({ id: 4, title: "Search results show duplicate records", version: 2 });
    expect(Object.keys(t).sort()).toEqual(
      ["assignee", "comments", "createdAt", "description", "id", "priority", "status", "title", "updatedAt", "version"],
    );
    expect(t.comments).toHaveLength(2);
    expect(t.comments[0]).toEqual({
      id: 2,
      body: expect.any(String),
      author: { id: 2, name: "Daniel Tan" },
      createdAt: "2026-10-03T00:55:00Z",
    });
  });

  it("returns 404 JSON for a missing ticket and 400 for a malformed id", async () => {
    const missing = await request(ctx.app).get("/api/tickets/9999").expect(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
    const bad = await request(ctx.app).get("/api/tickets/abc").expect(400);
    expect(bad.body.error).toMatchObject({ code: "VALIDATION_ERROR", details: [{ field: "id" }] });
  });
});

describe("GET /api/users", () => {
  it("lists candidate assignees without email addresses", async () => {
    const res = await request(ctx.app).get("/api/users").expect(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0]).toEqual({ id: 1, name: "Asha Rao" });
  });
});

describe("misc", () => {
  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(ctx.app).get("/api/nope").expect(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("keeps status/priority enums in sync with the database CHECK constraints", () => {
    const { sql } = ctx.db.prepare("SELECT sql FROM sqlite_master WHERE name = 'tickets'").get() as { sql: string };
    const values = (col: string) => {
      const m = sql.match(new RegExp(`CHECK\\(${col} IN \\(([^)]*)\\)\\)`));
      return m![1].split(",").map((v) => v.trim().replace(/'/g, ""));
    };
    expect(values("status")).toEqual([...TICKET_STATUSES]);
    expect(values("priority")).toEqual([...TICKET_PRIORITIES]);
  });
});
