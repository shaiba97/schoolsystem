export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Platform API fetch. Browser callers go through /api/backend with no manual
 * auth headers: the proxy injects Authorization from the httpOnly cookie, so
 * the platform JWT never touches JS. Server callers (RSC) authenticate
 * cookie-first via getIncomingSystemHeaders.
 */
export async function systemApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  if (typeof window === "undefined") {
    const { getIncomingSystemHeaders, systemApiUrl } = await import("./session");
    const session = await getIncomingSystemHeaders();
    if (session.authorization) headers.set("Authorization", session.authorization);
    const response = await fetch(systemApiUrl(path), { ...init, headers, cache: "no-store" });
    return parseResponse<T>(response);
  }

  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401 && window.location.pathname !== "/login") {
    // Hard navigation (not router.push): an expired session must drop all
    // in-memory state before landing on login.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError("Session expired — please sign in again", 401);
  }
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
