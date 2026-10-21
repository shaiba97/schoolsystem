"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import { systemApiFetch, ApiError } from "@/lib/api/client";
import type {
  PlatformTenantList,
  PlatformTenantListItem,
} from "@/lib/api/platform-types";
import { Badge } from "@/components/ui/badge";
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

const STATUS_VARIANT: Record<
  PlatformTenantListItem["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  PENDING: "outline",
  SUSPENDED: "destructive",
  ARCHIVED: "outline",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "Trial" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export function TenantsDirectoryClient() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<PlatformTenantList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");

      try {
        const result = await systemApiFetch<PlatformTenantList>(
          `/platform/tenants?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!cancelled) setData(result);
      } catch (err) {
        if (cancelled) return;
        setData(null);
        setError(
          err instanceof ApiError ? err.message : "Could not load the school directory.",
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
  }, [search, status, page]);

  function applySearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">School directory</h1>
        <p className="text-sm text-muted-foreground">
          Every school on the platform. Open one to manage modules, flags, and status.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => applySearch(event.target.value)}
            placeholder="Search name, slug, or email"
            aria-label="Search schools"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value || "all"}
              type="button"
              size="sm"
              variant={status === filter.value ? "default" : "outline"}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="border-t border-destructive/40 pt-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      {!error && loading && !data ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : null}

      {!error && data && data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 border-t pt-8">
          <Building2 size={20} className="text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No schools match this view</p>
          <p className="text-sm text-muted-foreground">
            Clear the search or pick another status to widen the list.
          </p>
        </div>
      ) : null}

      {!error && data && data.items.length > 0 ? (
        <>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Portals</TableHead>
                  <TableHead className="text-right">Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="font-medium hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.plan ? tenant.plan.name : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{tenant.users}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {tenant.enabledModules}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {new Date(tenant.createdAt).toISOString().slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <p className="text-muted-foreground">
              {data.total} schools, page {data.page} of {data.pageCount}
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
