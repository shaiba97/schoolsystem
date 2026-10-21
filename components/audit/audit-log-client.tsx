"use client";

import * as React from "react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import type { PlatformAuditList } from "@/lib/api/platform-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatTimestamp(value: string) {
  return new Date(value).toISOString().replace("T", " ").slice(0, 16);
}

function describeChange(entry: { oldValues: unknown; newValues: unknown }) {
  const next = entry.newValues as Record<string, unknown> | null;
  const old = entry.oldValues as Record<string, unknown> | null;
  if (!next && !old) return "—";
  const parts = Object.entries(next ?? {}).map(([key, value]) => {
    const previous = old?.[key];
    if (previous === undefined) return `${key}: ${String(value)}`;
    return `${key}: ${String(previous)} → ${String(value)}`;
  });
  return parts.length ? parts.join(", ") : "—";
}

export function AuditLogClient() {
  const [action, setAction] = React.useState("");
  const [appliedAction, setAppliedAction] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<PlatformAuditList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (appliedAction) params.set("action", appliedAction);
      params.set("page", String(page));
      params.set("limit", "25");

      try {
        const result = await systemApiFetch<PlatformAuditList>(
          `/platform/audit?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!cancelled) setData(result);
      } catch (err) {
        if (cancelled) return;
        setData(null);
        setError(
          err instanceof ApiError ? err.message : "Could not load the platform audit log.",
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
  }, [appliedAction, page]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Platform audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every cross-tenant action taken from this console, with actor, school, and
          before/after values.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedAction(action.trim());
        }}
      >
        <div className="sm:max-w-xs sm:flex-1">
          <label htmlFor="audit-action" className="sr-only">
            Filter by action
          </label>
          <Input
            id="audit-action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Filter by action, e.g. tenant.status"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        {appliedAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction("");
              setAppliedAction("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>

      {error ? (
        <div className="border-t border-destructive/40 pt-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      {!error && loading && !data ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : null}

      {!error && data && data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 border-t pt-8">
          <p className="text-sm font-medium">No platform actions recorded</p>
          <p className="text-sm text-muted-foreground">
            Actions taken from this console appear here as soon as they happen.
          </p>
        </div>
      ) : null}

      {!error && data && data.items.length > 0 ? (
        <>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.actorName ?? "System"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.tenantName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[28rem] whitespace-normal text-xs text-muted-foreground">
                      {describeChange(entry)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <p className="text-muted-foreground">
              {data.total} entries, page {data.page} of {data.pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={data.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={data.page >= data.pageCount || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
