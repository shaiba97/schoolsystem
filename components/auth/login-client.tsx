"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlatformRole = "SUPER_ADMIN" | "SUPPORT";

type LoginResult =
  | { ok: true; role: PlatformRole }
  | { ok: false; message: string };

async function postLogin(email: string, password: string): Promise<LoginResult> {
  const response = await fetch("/api/session/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.ok) {
    const data = await response.json().catch(() => ({}));
    const role =
      data && typeof data === "object" && (data as { profile?: { role?: string } }).profile?.role;
    try {
      window.sessionStorage.setItem("sys_roles", JSON.stringify(role ? [role] : []));
    } catch {
      // Storage unavailable — nav gates deny by default, login still works.
    }
    return { ok: true, role: role === "SUPPORT" ? "SUPPORT" : "SUPER_ADMIN" };
  }
  const data = await response.json().catch(() => undefined);
  const message =
    typeof data === "object" && data && "message" in data
      ? String((data as { message: unknown }).message)
      : "Sign in failed";
  return { ok: false, message };
}

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit() {
    setPending(true);
    setError("");
    try {
      const result = await postLogin(email.trim(), password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Platform console is unavailable — try again");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    void submit();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Platform Console</h1>
        <p className="text-sm text-muted-foreground">
          Provider access to schools, licensing, and support.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Administrator sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="root@platform.dev"
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !email.trim() || !password}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Platform administrators only — school staff use their own portal.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
