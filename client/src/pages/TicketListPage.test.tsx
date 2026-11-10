import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch } from "../test/mockApi";
import { TicketListPage } from "./TicketListPage";

afterEach(() => vi.unstubAllGlobals());

const row = {
  id: 1,
  title: "Login page loops after password reset",
  status: "in_progress",
  priority: "critical",
  assignee: { id: 2, name: "Daniel Tan" },
  updatedAt: "2026-10-01T18:30:00Z",
};
const page = (data: unknown[], totalItems = data.length) => ({
  status: 200,
  body: { data, pagination: { page: 1, pageSize: 10, totalItems, totalPages: Math.ceil(totalItems / 10) } },
});

const renderAt = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <TicketListPage />
    </MemoryRouter>,
  );

describe("TicketListPage", () => {
  it("shows loading, then the ticket rows with all list columns", async () => {
    mockFetch({ "GET /api/tickets": () => page([row, { ...row, id: 2, title: "Other", assignee: null }], 12) });
    renderAt();
    expect(screen.getByText("Loading tickets…")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: row.title })).toHaveAttribute("href", "/tickets/1");
    const headers = within(screen.getByRole("table")).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["ID", "Title", "Priority", "Status", "Assignee", "Last updated"]);
    const [, first, second] = within(screen.getByRole("table")).getAllByRole("row");
    const cells = within(first).getAllByRole("cell").map((c) => c.textContent);
    expect(cells.slice(0, 5)).toEqual(["#1", row.title, "Critical", "In progress", "Daniel Tan"]);
    expect(within(first).getByRole("time")).toHaveAttribute("dateTime", row.updatedAt);
    expect(within(second).getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2 · 12 tickets")).toBeInTheDocument();
  });

  it("passes filters from the URL to the server", async () => {
    const api = mockFetch({ "GET /api/tickets": () => page([row]) });
    renderAt("/?status=open&priority=high&q=login&page=2");
    await screen.findByRole("link", { name: row.title });
    const params = Object.fromEntries(api.calls[0].url.searchParams);
    expect(params).toEqual({ status: "open", priority: "high", q: "login", page: "2", pageSize: "10" });
  });

  it("changing a filter re-queries the server and resets to page 1", async () => {
    const api = mockFetch({ "GET /api/tickets": () => page([row]) });
    renderAt("/?page=2");
    await screen.findByRole("link", { name: row.title });
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "critical");
    await vi.waitFor(() => expect(api.calls.length).toBe(2));
    expect(api.calls[1].url.searchParams.get("priority")).toBe("critical");
    expect(api.calls[1].url.searchParams.get("page")).toBe("1");
  });

  it("shows an empty state with a way to clear filters", async () => {
    mockFetch({ "GET /api/tickets": () => page([]) });
    renderAt("/?q=nothing-matches");
    expect(await screen.findByText(/No tickets match these filters/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear filters" }).length).toBeGreaterThan(0);
  });

  it("shows an error state with a retry that recovers", async () => {
    let fail = true;
    mockFetch({
      "GET /api/tickets": () =>
        fail
          ? { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } } }
          : page([row]),
    });
    renderAt();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load tickets. An unexpected error occurred");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: row.title })).toBeInTheDocument();
  });

  it("shows a network error when the API is unreachable", async () => {
    mockFetch({ "GET /api/tickets": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderAt();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });
});
