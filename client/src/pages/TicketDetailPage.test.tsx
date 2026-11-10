import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, ticket, users } from "../test/mockApi";
import { TicketDetailPage } from "./TicketDetailPage";

afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tickets/7"]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage", () => {
  it("shows the full ticket and its comments", async () => {
    mockFetch({
      "GET /api/tickets/7": () => ({ status: 200, body: { data: ticket() } }),
      "GET /api/users": () => ({ status: 200, body: { data: users } }),
    });
    renderPage();
    expect(screen.getByText("Loading ticket…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "API returns 500 for malformed date filter" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("#7");
    expect(screen.getByText("Steps to reproduce…")).toBeInTheDocument();
    expect(screen.getByText("Looking into it")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comments 1" })).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument(); // priority shown (read-only)
  });

  it("sends only the changed field with the loaded version and confirms the save", async () => {
    const api = mockFetch({
      "GET /api/tickets/7": () => ({ status: 200, body: { data: ticket() } }),
      "GET /api/users": () => ({ status: 200, body: { data: users } }),
      "PATCH /api/tickets/7": () => ({ status: 200, body: { data: ticket({ status: "resolved", version: 4 }) } }),
    });
    renderPage();
    const form = await screen.findByRole("form", { name: "Update ticket" });
    const save = within(form).getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled(); // nothing changed yet

    await userEvent.selectOptions(within(form).getByLabelText("Status"), "resolved");
    await userEvent.click(save);

    expect(await screen.findByText("Changes saved (now version 4).")).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === "PATCH")?.body).toEqual({ version: 3, status: "resolved" });
  });

  it("on 409 shows that nothing was saved, blocks re-saving, and reloads the latest ticket", async () => {
    let serverTicket = ticket();
    const latest = ticket({ status: "in_progress", assignee: { id: 2, name: "Daniel Tan" }, version: 4 });
    mockFetch({
      "GET /api/tickets/7": () => ({ status: 200, body: { data: serverTicket } }),
      "GET /api/users": () => ({ status: 200, body: { data: users } }),
      "PATCH /api/tickets/7": () => {
        serverTicket = latest; // someone else saved first
        return {
          status: 409,
          body: {
            error: {
              code: "VERSION_CONFLICT",
              message: "Ticket 7 was changed by someone else",
              details: { yourVersion: 3, currentVersion: 4, currentTicket: latest },
            },
          },
        };
      },
    });
    renderPage();
    const form = await screen.findByRole("form", { name: "Update ticket" });
    await userEvent.selectOptions(within(form).getByLabelText("Status"), "resolved");
    await userEvent.click(within(form).getByRole("button", { name: "Save changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your changes were not saved.");
    expect(alert).toHaveTextContent("you were editing version 3; the latest is version 4");
    expect(within(alert).getByText("Resolved")).toBeInTheDocument(); // the user's unsaved change
    expect(within(alert).getByText("In progress")).toBeInTheDocument(); // latest saved status
    expect(within(alert).getAllByText("Daniel Tan").length).toBeGreaterThan(0); // other user's assignee change
    expect(screen.queryByText(/Changes saved/)).not.toBeInTheDocument();
    expect(within(form).getByLabelText("Status")).toBeDisabled();

    await userEvent.click(within(alert).getByRole("button", { name: "Reload latest ticket" }));

    expect(await screen.findByText("4", { selector: "dd" })).toBeInTheDocument(); // version shown
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const reloadedForm = screen.getByRole("form", { name: "Update ticket" });
    expect(within(reloadedForm).getByLabelText("Status")).toHaveValue("in_progress");
    expect(within(reloadedForm).getByLabelText("Assignee")).toHaveValue("2");
    expect(within(reloadedForm).getByLabelText("Status")).toBeEnabled();
  });

  it("shows server validation errors with field details", async () => {
    mockFetch({
      "GET /api/tickets/7": () => ({ status: 200, body: { data: ticket() } }),
      "GET /api/users": () => ({ status: 200, body: { data: users } }),
      "PATCH /api/tickets/7": () => ({
        status: 422,
        body: {
          error: {
            code: "UNKNOWN_ASSIGNEE",
            message: "User 2 does not exist",
            details: [{ field: "assigneeId", message: "must be the id of an existing user, or null to unassign" }],
          },
        },
      }),
    });
    renderPage();
    const form = await screen.findByRole("form", { name: "Update ticket" });
    await userEvent.selectOptions(within(form).getByLabelText("Assignee"), "2");
    await userEvent.click(within(form).getByRole("button", { name: "Save changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your changes were not saved. User 2 does not exist");
    expect(alert).toHaveTextContent("assigneeId: must be the id of an existing user");
  });

  it("shows a not-found error for a missing ticket", async () => {
    mockFetch({
      "GET /api/tickets/7": () => ({ status: 404, body: { error: { code: "TICKET_NOT_FOUND", message: "Ticket 7 does not exist" } } }),
      "GET /api/users": () => ({ status: 200, body: { data: users } }),
    });
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Ticket 7 does not exist");
  });
});
