import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import Database from "better-sqlite3";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContext } from "./helpers.js";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => (ctx = createTestContext()));
afterEach(() => ctx.cleanup());

const row = (id: number) =>
  ctx.db.prepare("SELECT status, assignee_id, version, updated_at FROM tickets WHERE id = ?").get(id) as {
    status: string;
    assignee_id: number | null;
    version: number;
    updated_at: string;
  };

const patch = (id: number | string, body: unknown) => request(ctx.app).patch(`/api/tickets/${id}`).send(body as object);

describe("PATCH /api/tickets/:id — success path", () => {
  it("updates status and assignee, bumps the version and persists the change", async () => {
    const before = (await request(ctx.app).get("/api/tickets/3").expect(200)).body.data;
    expect(before).toMatchObject({ status: "open", assignee: { id: 4 }, version: 1 });

    const res = await patch(3, { version: 1, status: "in_progress", assigneeId: 1 }).expect(200);
    expect(res.body.data).toMatchObject({
      id: 3,
      status: "in_progress",
      assignee: { id: 1, name: "Asha Rao" },
      version: 2,
      priority: before.priority, // untouched
      title: before.title,
    });
    expect(res.body.data.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(res.body.data.updatedAt > before.updatedAt).toBe(true);

    // persisted: visible through the API and in the database
    const after = (await request(ctx.app).get("/api/tickets/3").expect(200)).body.data;
    expect(after).toEqual(res.body.data);
    expect(row(3)).toMatchObject({ status: "in_progress", assignee_id: 1, version: 2 });
  });

  it("changes only the fields that were sent", async () => {
    await patch(3, { version: 1, status: "resolved" }).expect(200);
    expect(row(3)).toMatchObject({ status: "resolved", assignee_id: 4, version: 2 });

    await patch(3, { version: 2, assigneeId: 2 }).expect(200);
    expect(row(3)).toMatchObject({ status: "resolved", assignee_id: 2, version: 3 });
  });

  it("unassigns with assigneeId: null", async () => {
    const res = await patch(3, { version: 1, assigneeId: null }).expect(200);
    expect(res.body.data.assignee).toBeNull();
    expect(row(3).assignee_id).toBeNull();
  });
});

describe("PATCH /api/tickets/:id — lost-update protection", () => {
  it("rejects a stale version with 409 (client read v3, database is at v4)", async () => {
    // Ticket 2 is seeded at version 3. Two users open it.
    const alice = (await request(ctx.app).get("/api/tickets/2").expect(200)).body.data;
    const bob = (await request(ctx.app).get("/api/tickets/2").expect(200)).body.data;
    expect(alice.version).toBe(3);

    // Bob saves first: v3 -> v4
    await patch(2, { version: bob.version, assigneeId: 1 }).expect(200);
    expect(row(2).version).toBe(4);

    // Alice saves later with her stale v3: must be rejected, not silently applied
    const res = await patch(2, { version: alice.version, status: "open" }).expect(409);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.error).toMatchObject({
      code: "VERSION_CONFLICT",
      message: expect.stringContaining("version 3"),
      details: {
        yourVersion: 3,
        currentVersion: 4,
        currentTicket: { id: 2, version: 4, status: "resolved", assignee: { id: 1, name: "Asha Rao" } },
      },
    });

    // Database still holds Bob's write and nothing of Alice's
    expect(row(2)).toMatchObject({ status: "resolved", assignee_id: 1, version: 4 });
  });

  it("detects a change made through a different database connection (check is in the UPDATE, not in app memory)", async () => {
    const other = new Database(ctx.dbPath);
    other.prepare("UPDATE tickets SET status = 'resolved', version = version + 1 WHERE id = 3").run();
    other.close();

    const res = await patch(3, { version: 1, assigneeId: 2 }).expect(409);
    expect(res.body.error.details.currentVersion).toBe(2);
    expect(row(3)).toMatchObject({ status: "resolved", assignee_id: 4, version: 2 });
  });

  it("lets exactly one of several truly concurrent writers (separate processes) win", async () => {
    const run = promisify(execFile);
    const tsx = path.resolve("node_modules/.bin/tsx");
    const tsxBin = (await import("node:fs")).existsSync(tsx) ? tsx : path.resolve("../node_modules/.bin/tsx");
    const script = path.resolve("tests/fixtures/concurrentUpdater.ts");
    const startAt = String(Date.now() + 2500); // give every process time to boot, then fire together

    const outcomes = await Promise.all(
      [1, 2, 3, 4].map((assignee) =>
        run(tsxBin, [script, ctx.dbPath, "3", "1", String(assignee), startAt]).then((r) => r.stdout.trim()),
      ),
    );

    expect(outcomes.filter((o) => o === "updated")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "conflict")).toHaveLength(3);
    expect(row(3).version).toBe(2); // exactly one increment
  }, 20_000);

  it("returns 404 (not 409) when the ticket does not exist", async () => {
    const res = await patch(9999, { version: 1, status: "open" }).expect(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });
});

describe("PATCH /api/tickets/:id — validation", () => {
  it.each([
    ["unknown status", { version: 1, status: "closed" }, "status"],
    ["priority is not editable", { version: 1, priority: "low" }, ""],
    ["title is not editable", { version: 1, title: "x", status: "open" }, ""],
    ["missing version", { status: "open" }, "version"],
    ["version as string", { version: "1", status: "open" }, "version"],
    ["fractional version", { version: 1.5, status: "open" }, "version"],
    ["no changes", { version: 1 }, ""],
    ["non-integer assignee", { version: 1, assigneeId: "2" }, "assigneeId"],
    ["zero assignee", { version: 1, assigneeId: 0 }, "assigneeId"],
    ["body is an array", [1, 2], ""],
  ])("400 for %s", async (_name, body, field) => {
    const res = await patch(3, body).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    if (field) expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    expect(row(3)).toMatchObject({ status: "open", assignee_id: 4, version: 1 }); // nothing written
  });

  it("422 for an assignee that does not exist", async () => {
    const res = await patch(3, { version: 1, assigneeId: 999 }).expect(422);
    expect(res.body.error).toMatchObject({ code: "UNKNOWN_ASSIGNEE", details: [{ field: "assigneeId" }] });
    expect(row(3).version).toBe(1);
  });

  it("400 for malformed JSON and 415 for a non-JSON body", async () => {
    const bad = await request(ctx.app)
      .patch("/api/tickets/3")
      .set("Content-Type", "application/json")
      .send('{"version": 1, "status": ')
      .expect(400);
    expect(bad.body.error.code).toBe("INVALID_JSON");

    const text = await request(ctx.app).patch("/api/tickets/3").set("Content-Type", "text/plain").send("hi").expect(415);
    expect(text.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("400 for a malformed ticket id", async () => {
    await patch("abc", { version: 1, status: "open" }).expect(400);
  });

  it("405 with an Allow header for unsupported methods", async () => {
    const del = await request(ctx.app).delete("/api/tickets/3").expect(405);
    expect(del.headers.allow).toBe("GET, PATCH");
    expect(del.body.error.code).toBe("METHOD_NOT_ALLOWED");
    expect((await request(ctx.app).post("/api/tickets").send({}).expect(405)).headers.allow).toBe("GET");
    expect((await request(ctx.app).put("/api/users").send({}).expect(405)).headers.allow).toBe("GET");
    expect(row(3).version).toBe(1);
  });
});
