import { NextResponse } from "next/server";
import { systemApiUrl, SYSTEM_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

type PlatformProfile = {
  id: string;
  role: "SUPER_ADMIN" | "SUPPORT";
};

type PlatformUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
};

type LoginResponse = {
  accessToken: string;
  user: PlatformUser;
  profile: PlatformProfile;
};

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Platform sign-in. Server administrators authenticate against the backend's
 * dedicated platform auth endpoint; the JWT carries scope: 'platform' and is
 * stored httpOnly so it never reaches client JS. There is no tenant step:
 * platform admins are cross-tenant by definition.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(systemApiUrl("/platform/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Platform API is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => undefined);
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Sign in failed";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  if (!data.accessToken) {
    return NextResponse.json({ message: "Sign in failed" }, { status: 502 });
  }

  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.json({
    ok: true,
    user: data.user,
    profile: data.profile,
  });
  response.headers.append(
    "Set-Cookie",
    `${SYSTEM_TOKEN_COOKIE}=${encodeURIComponent(data.accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? "; Secure" : ""}`,
  );
  return response;
}
