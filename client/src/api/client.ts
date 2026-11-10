import type {
  ListTicketsParams,
  TicketDetail,
  TicketListResponse,
  TicketUpdate,
  UserSummary,
} from "./types";

export const PAGE_SIZE = 10;

/** Any non-2xx response or network failure, normalised from the API's `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number, // 0 = network failure
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check that the API is running and try again.");
  }

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "HTTP_ERROR", e?.message ?? `Request failed (HTTP ${res.status})`, e?.details);
  }
  return body as T;
}

export const api = {
  listTickets(params: ListTicketsParams, signal?: AbortSignal) {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(PAGE_SIZE) });
    if (params.status) qs.set("status", params.status);
    if (params.priority) qs.set("priority", params.priority);
    if (params.q) qs.set("q", params.q);
    return request<TicketListResponse>(`/api/tickets?${qs}`, { signal });
  },

  async getTicket(id: number, signal?: AbortSignal) {
    return (await request<{ data: TicketDetail }>(`/api/tickets/${id}`, { signal })).data;
  },

  async listUsers(signal?: AbortSignal) {
    return (await request<{ data: UserSummary[] }>("/api/users", { signal })).data;
  },

  async updateTicket(id: number, update: TicketUpdate) {
    return (await request<{ data: TicketDetail }>(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(update) }))
      .data;
  },
};
