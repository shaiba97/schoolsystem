"use client";

import * as React from "react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import type { PlatformAnnouncement } from "@/lib/api/platform-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const SEVERITIES: Array<{ value: "INFO" | "WARNING" | "CRITICAL"; label: string }> = [
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

const SEVERITY_VARIANT: Record<
  PlatformAnnouncement["severity"],
  "secondary" | "destructive" | "outline"
> = {
  INFO: "secondary",
  WARNING: "outline",
  CRITICAL: "destructive",
};

export function AnnouncementsClient() {
  const [rows, setRows] = React.useState<PlatformAnnouncement[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [severity, setSeverity] = React.useState<"INFO" | "WARNING" | "CRITICAL">("INFO");

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("sys_roles");
      const roles = raw ? (JSON.parse(raw) as string[]) : [];
      setIsSuperAdmin(roles.includes("SUPER_ADMIN"));
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await systemApiFetch<PlatformAnnouncement[]>(
          "/platform/announcements",
          { signal: controller.signal },
        );
        if (!cancelled) setRows(result);
      } catch (err) {
        if (cancelled) return;
        setRows(null);
        setError(
          err instanceof ApiError ? err.message : "Could not load announcements.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function publish() {
    setPending("create");
    setError(null);
    try {
      await systemApiFetch<PlatformAnnouncement>("/platform/announcements", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim(), severity }),
      });
      setTitle("");
      setBody("");
      setSeverity("INFO");
      const refreshed = await systemApiFetch<PlatformAnnouncement[]>(
        "/platform/announcements",
      );
      setRows(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The announcement was not published.");
    } finally {
      setPending(null);
    }
  }

  async function setActive(id: string, isActive: boolean) {
    setPending(id);
    setError(null);
    try {
      await systemApiFetch<PlatformAnnouncement>(`/platform/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      const refreshed = await systemApiFetch<PlatformAnnouncement[]>(
        "/platform/announcements",
      );
      setRows(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The change could not be saved.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide notices published for every school. Delivery into school portals
          is a separate step.
        </p>
      </header>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isSuperAdmin ? (
        <section className="border-t pt-4">
          <h2 className="text-sm font-semibold">Publish an announcement</h2>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Scheduled maintenance on Friday"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea
                id="announcement-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What schools need to know, and what they should do."
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-severity">Severity</Label>
              <select
                id="announcement-severity"
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value as "INFO" | "WARNING" | "CRITICAL")
                }
                className="flex h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {SEVERITIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                type="button"
                disabled={
                  pending === "create" || title.trim().length < 3 || body.trim().length < 3
                }
                onClick={() => void publish()}
              >
                {pending === "create" ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <p className="border-t pt-4 text-xs text-muted-foreground">
          Support accounts can read announcements but not publish them.
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold">Published announcements</h2>
        {loading && !rows ? (
          <div className="mt-3 flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : null}

        {rows && rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No announcements have been published yet.
          </p>
        ) : null}

        {rows && rows.length > 0 ? (
          <ul className="mt-3 divide-y border-t">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{row.title}</span>
                  <Badge variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Badge>
                  {!row.isActive ? <Badge variant="outline">withdrawn</Badge> : null}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {new Date(row.publishedAt).toISOString().slice(0, 10)}
                  </span>
                </div>
                <p className="max-w-[70ch] text-sm text-muted-foreground">{row.body}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {row.author ?? "Platform"}
                  </span>
                  {isSuperAdmin ? (
                    <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      {row.isActive ? "Published" : "Withdrawn"}
                      <Switch
                        checked={row.isActive}
                        disabled={pending === row.id}
                        onCheckedChange={(next: boolean) => void setActive(row.id, next)}
                        aria-label={`Toggle ${row.title}`}
                      />
                    </label>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
