import { NextResponse } from "next/server";
import { SYSTEM_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${SYSTEM_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
  );
  return response;
}
