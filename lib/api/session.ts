const API_URL = process.env.SYSTEM_API_URL || "http://localhost:3000/api";

export const SYSTEM_AUTH_HEADER = "authorization";
/**
 * Platform session cookie. Unlike the school portals there is no tenant
 * cookie: platform requests are authorized by the token's scope alone, and
 * tenant context is passed explicitly per endpoint (tenant detail, actions).
 */
export const SYSTEM_TOKEN_COOKIE = "sys_token";

export class SystemSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SystemSessionError";
    this.status = status;
  }
}

/** Dev bypass mirroring the backend's AUTH_NO_SESSION: unauthenticated local work. */
const NO_SESSION = process.env.SYSTEM_NO_AUTH === "true";

export function systemRequestHeaders(source: Headers) {
  const authorization = source.get(SYSTEM_AUTH_HEADER);

  if (NO_SESSION) {
    return { authorization: authorization || "" };
  }
  if (!authorization) throw new SystemSessionError("Platform session is missing", 401);
  return { authorization };
}

/**
 * Cookie-first resolution for the browser proxy: login stores the platform
 * JWT in an httpOnly cookie (invisible to JS), so the proxy route reads it
 * here and forwards it as a header. A direct header still wins when present
 * (server-to-server calls, tooling).
 */
export async function getProxySession(request: Request) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const headerAuth = request.headers.get(SYSTEM_AUTH_HEADER);
  const token = jar.get(SYSTEM_TOKEN_COOKIE)?.value;
  const authorization = headerAuth || (token ? `Bearer ${token}` : "");
  return systemRequestHeaders(
    new Headers(authorization ? { [SYSTEM_AUTH_HEADER]: authorization } : {}),
  );
}

/**
 * Server components/RSC fetches authenticate cookie-first when no direct
 * Authorization header exists (browser page navigations only carry the
 * session cookie, never the header).
 */
export async function getIncomingSystemHeaders() {
  const { headers, cookies } = await import("next/headers");
  const requestHeaders = await headers();
  if (NO_SESSION || requestHeaders.get(SYSTEM_AUTH_HEADER)) {
    return systemRequestHeaders(requestHeaders);
  }
  const jar = await cookies();
  const token = jar.get(SYSTEM_TOKEN_COOKIE)?.value;
  if (!token) return systemRequestHeaders(requestHeaders);
  return systemRequestHeaders(
    new Headers({ [SYSTEM_AUTH_HEADER]: `Bearer ${token}` }),
  );
}

export function systemApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
