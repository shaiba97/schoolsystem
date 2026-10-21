"use client";

import * as React from "react";
import { Activity, Database, HardDrive, Radio, RefreshCw } from "lucide-react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import type { PlatformHealthReport } from "@/lib/api/health-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Activity;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function HealthClient() {
  const [report, setReport] = React.useState<PlatformHealthReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await systemApiFetch<PlatformHealthReport>(
        "/platform/health",
      );
      setReport(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The health endpoint is unreachable.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading && !report) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">System health</h1>
            {report ? (
              <Badge variant={report.status === "ok" ? "default" : "destructive"}>
                {report.status === "ok" ? "All systems go" : "Degraded"}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {report
              ? `Checked ${new Date(report.checkedAt).toISOString().replace("T", " ").slice(0, 19)} · up ${formatUptime(report.uptimeSeconds)}`
              : "No report yet."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <RefreshCw size={14} aria-hidden />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Database
              </p>
              <p className="font-mono text-lg">
                {report.database.reachable ? "Up" : "Down"}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.database.latencyMs} ms round trip
              </p>
            </div>
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Live connections
              </p>
              <p className="font-mono text-lg">{report.realtime.connections}</p>
              <p className="text-xs text-muted-foreground">websockets open</p>
            </div>
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Storage
              </p>
              <p className="font-mono text-lg">{formatBytes(report.storage.bytes)}</p>
              <p className="text-xs text-muted-foreground">
                {report.storage.files} files
              </p>
            </div>
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Memory
              </p>
              <p className="font-mono text-lg">{report.process.memory.rssMb} MB</p>
              <p className="text-xs text-muted-foreground">
                heap {report.process.memory.heapUsedMb} MB
              </p>
            </div>
          </div>

          <Panel icon={Database} title="Data">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measure</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Schools</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.tenants}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Active schools</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.activeTenants}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Locked schools</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.suspendedTenants}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Archived schools</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.archivedTenants}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Users</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.users}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Students</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.students}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Teachers</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.teachers}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Active licences</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.activeLicences} of {report.counts.licences}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Plan tiers</TableCell>
                  <TableCell className="text-right font-mono">
                    {report.counts.plans}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel icon={Activity} title="Runtime">
              <dl className="divide-y border-t">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Node</dt>
                  <dd className="font-mono text-sm">{report.process.node}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Platform</dt>
                  <dd className="font-mono text-sm">{report.process.platform}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Uptime</dt>
                  <dd className="font-mono text-sm">
                    {formatUptime(report.uptimeSeconds)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Database</dt>
                  <dd className="font-mono text-sm">
                    {report.database.reachable
                      ? `up, ${report.database.latencyMs} ms`
                      : `down: ${report.database.error}`}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel icon={HardDrive} title="Storage">
              <dl className="divide-y border-t">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Root</dt>
                  <dd className="font-mono text-sm">{report.storage.root}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Used</dt>
                  <dd className="font-mono text-sm">
                    {formatBytes(report.storage.bytes)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Files</dt>
                  <dd className="font-mono text-sm">{report.storage.files}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">Sockets</dt>
                  <dd className="font-mono text-sm">
                    {report.realtime.connections}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio size={12} aria-hidden />
            A liveness probe is available without a token at GET /api/health.
          </p>
        </>
      ) : null}
    </div>
  );
}
