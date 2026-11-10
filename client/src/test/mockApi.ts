import { vi } from "vitest";

type Handler = (url: URL, init: RequestInit | undefined) => { status: number; body: unknown } | Promise<never>;

/** Replaces global fetch with a router over `METHOD /path` handlers; records every call. */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: { method: string; url: URL; body?: unknown }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const handler = routes[`${method} ${url.pathname}`];
    if (!handler) throw new Error(`Unmocked request: ${method} ${url.pathname}`);
    const { status, body } = await handler(url, init);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return { calls };
}

export const users = [
  { id: 1, name: "Asha Rao" },
  { id: 2, name: "Daniel Tan" },
];

export const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: "API returns 500 for malformed date filter",
  description: "Steps to reproduce…",
  status: "open",
  priority: "medium",
  assignee: { id: 1, name: "Asha Rao" },
  version: 3,
  createdAt: "2026-10-02T10:00:00Z",
  updatedAt: "2026-10-03T12:30:00Z",
  comments: [{ id: 1, body: "Looking into it", author: { id: 2, name: "Daniel Tan" }, createdAt: "2026-10-03T13:00:00Z" }],
  ...overrides,
});
