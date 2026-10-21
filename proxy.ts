import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SYSTEM_NO_AUTH_BYPASS } from "./lib/auth-flag";
import { SYSTEM_TOKEN_COOKIE } from "./lib/api/session";

const PORTAL_PATHS = [
  "/dashboard",
  "/tenants",
  "/health",
  "/audit",
  "/announcements",
  "/licensing",
];

/**
 * Portal guard (Next 16 `proxy` convention): cookie presence only. Token
 * validity, platform scope, and admin status are enforced per request by the
 * backend PlatformAdminGuard (401s redirect to /login client-side). Role-level
 * access (licensing, audit) is enforced by nav gates + backend role checks,
 * never by this cookie check alone.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPortalPath = PORTAL_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  const token = request.cookies.get(SYSTEM_TOKEN_COOKIE)?.value;

  if (SYSTEM_NO_AUTH_BYPASS) return NextResponse.next();

  if (isPortalPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/tenants",
    "/health",
    "/audit",
    "/announcements",
    "/licensing",
    "/dashboard/:path*",
    "/tenants/:path*",
    "/health/:path*",
    "/audit/:path*",
    "/announcements/:path*",
    "/licensing/:path*",
    "/login",
  ],
};
