"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import {
  PORTAL_MODULES,
  type PlatformTenantDetail,
  type PortalModuleName,
} from "@/lib/api/platform-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["overview", "modules", "billing", "data"] as const;
type TabKey = (typeof TABS)[number];

const STATUS_VARIANT: Record<
  PlatformTenantDetail["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  PENDING: "outline",
  SUSPENDED: "destructive",
  ARCHIVED: "outline",
};

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function formatTimestamp(value: string) {
  return new Date(value).toISOString().replace("T", " ").slice(0, 16);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function TenantDetailClient({
  initialTenant,
  initialTab,
}: {
  initialTenant: PlatformTenantDetail;
  initialTab: TabKey;
}) {
  const router = useRouter();
  const [tenant, setTenant] = React.useState(initialTenant);
  const [tab, setTab] = React.useState<TabKey>(initialTab);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("sys_roles");
      const roles = raw ? (JSON.parse(raw) as string[]) : [];
      setIsSuperAdmin(roles.includes("SUPER_ADMIN"));
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  function selectTab(next: string) {
    const value = (TABS as readonly string[]).includes(next) ? (next as TabKey) : "overview";
    setTab(value);
    const url = `/tenants/${tenant.id}?tab=${value}`;
    window.history.replaceState(null, "", url);
  }

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The change could not be saved.");
    } finally {
      setPending(null);
    }
  }

  function changeStatus(next: PlatformTenantDetail["status"]) {
    return run("status", async () => {
      const result = await systemApiFetch<{ id: string; status: PlatformTenantDetail["status"] }>(
        `/platform/tenants/${tenant.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: next }) },
      );
      setTenant((current) => ({ ...current, status: result.status }));
      router.refresh();
    });
  }

  function toggleModule(module: PortalModuleName, enabled: boolean) {
    return run(`module:${module}`, async () => {
      const result = await systemApiFetch<{ module: string; enabled: boolean }>(
        `/platform/tenants/${tenant.id}/modules/${module}`,
        { method: "PATCH", body: JSON.stringify({ enabled }) },
      );
      setTenant((current) => ({
        ...current,
        modules: current.modules.map((row) =>
          row.module === module ? { ...row, enabled: result.enabled } : row,
        ),
      }));
    });
  }

  function toggleFlag(key: string, enabled: boolean) {
    return run(`flag:${key}`, async () => {
      const result = await systemApiFetch<{ key: string; enabled: boolean }>(
        `/platform/tenants/${tenant.id}/flags/${encodeURIComponent(key)}`,
        { method: "PATCH", body: JSON.stringify({ enabled }) },
      );
      setTenant((current) => ({
        ...current,
        featureFlags: current.featureFlags.map((row) =>
          row.key === key ? { ...row, enabled: result.enabled } : row,
        ),
      }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{tenant.name}</h1>
          <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {tenant.slug} · created {formatDate(tenant.createdAt)}
        </p>
        {isSuperAdmin ? (
          <div className="flex flex-wrap gap-2">
            {tenant.status !== "SUSPENDED" && tenant.status !== "ARCHIVED" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending === "status"}
                onClick={() => void changeStatus("SUSPENDED")}
              >
                Suspend school
              </Button>
            ) : null}
            {tenant.status === "SUSPENDED" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending === "status"}
                onClick={() => void changeStatus("ACTIVE")}
              >
                Reactivate school
              </Button>
            ) : null}
            {tenant.status !== "ARCHIVED" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending === "status"}
                onClick={() => void changeStatus("ARCHIVED")}
              >
                Archive school
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Support accounts have read-only access to school settings.
          </p>
        )}
      </header>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => selectTab(String(value))}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="data">Feature flags</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-8 pt-4 md:grid-cols-2">
            <dl className="divide-y border-t">
              <Field label="Contact email" value={tenant.email ?? "—"} />
              <Field label="Phone" value={tenant.phone ?? "—"} />
              <Field label="Country" value={tenant.countryCode ?? "—"} />
              <Field label="Currency" value={tenant.currencyCode} />
              <Field label="Timezone" value={tenant.timezone} />
              <Field label="Weekend days" value={tenant.weekendDays.join(", ")} />
            </dl>
            <div>
              <p className="text-sm font-semibold">Usage</p>
              <dl className="mt-2 divide-y border-t">
                <Field label="Staff accounts" value={tenant.counts.users} />
                <Field label="Students" value={tenant.counts.students} />
                <Field label="Teachers" value={tenant.counts.teachers} />
                <Field
                  label="Enabled portals"
                  value={tenant.modules.filter((row) => row.enabled).length}
                />
              </dl>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold">Recent platform activity</p>
            {tenant.recentActivity.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No platform actions have been recorded for this school yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y border-t">
                {tenant.recentActivity.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-2 text-sm">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
                      {entry.oldValues || entry.newValues
                        ? ` · ${JSON.stringify(entry.newValues ?? entry.oldValues)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <p className="pt-4 text-sm text-muted-foreground">
            Portals a school can reach. Turning one off hides it from that school&apos;s
            navigation.
          </p>
          <ul className="mt-4 divide-y border-t">
            {PORTAL_MODULES.map((module) => {
              const row = tenant.modules.find((entry) => entry.module === module);
              const enabled = row?.enabled ?? false;
              return (
                <li key={module} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{module.toLowerCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={!isSuperAdmin || pending === `module:${module}`}
                    onCheckedChange={(next: boolean) => void toggleModule(module, next)}
                    aria-label={`Toggle ${module.toLowerCase()} portal`}
                  />
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="billing">
          <div className="pt-4">
            <p className="text-sm font-semibold">Licenses</p>
            {tenant.licenses.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No license issued yet.</p>
            ) : (
              <ul className="mt-2 divide-y border-t">
                {tenant.licenses.map((license) => (
                  <li key={license.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="text-sm font-medium">{license.plan.name}</span>
                    <Badge variant="outline">{license.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {license.plan.billingModel === "ANNUAL"
                        ? `${CURRENCY.format(license.plan.price)} / year`
                        : `${CURRENCY.format(license.plan.price)} one-off`}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {formatDate(license.startedAt)} → {formatDate(license.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold">Invoices</p>
            {tenant.invoices.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No invoices raised yet.</p>
            ) : (
              <ul className="mt-2 divide-y border-t">
                {tenant.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="font-mono text-sm">{invoice.number}</span>
                    <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                      {invoice.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{invoice.kind}</span>
                    <span className="ml-auto font-mono text-sm">
                      {CURRENCY.format(invoice.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="data">
          <p className="pt-4 text-sm text-muted-foreground">
            Optional platform capabilities this school has switched on.
          </p>
          {tenant.featureFlags.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No feature flags set.</p>
          ) : (
            <ul className="mt-4 divide-y border-t">
              {tenant.featureFlags.map((flag) => (
                <li key={flag.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm">{flag.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    disabled={!isSuperAdmin || pending === `flag:${flag.key}`}
                    onCheckedChange={(next: boolean) => void toggleFlag(flag.key, next)}
                    aria-label={`Toggle ${flag.key}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
