import { systemApiFetch } from "@/lib/api/client";
import type { PlatformStats } from "@/lib/api/platform-types";
import { ApiError } from "@/lib/api/client";

export const dynamic = "force-dynamic";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat("en-US");

const STATUS_ROWS: Array<{ key: keyof PlatformStats["tenants"]; label: string }> = [
  { key: "ACTIVE", label: "Active" },
  { key: "TRIAL", label: "Trial" },
  { key: "PENDING", label: "Pending" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "ARCHIVED", label: "Archived" },
];

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-t px-1 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-2xl leading-tight tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function PlatformDashboardPage() {
  let stats: PlatformStats | null = null;
  let errorMessage: string | null = null;

  try {
    stats = await systemApiFetch<PlatformStats>("/platform/stats");
  } catch (error) {
    errorMessage =
      error instanceof ApiError
        ? error.message
        : "The platform API is unreachable right now.";
  }

  if (!stats) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Control plane</h1>
        <div className="border-t border-destructive/40 pt-4">
          <p className="text-sm font-medium text-destructive">Platform metrics unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const { tenants, licensing } = stats;
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((row) => tenants[row.key] as number));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Control plane</h1>
        <p className="text-sm text-muted-foreground">
          {NUMBER.format(tenants.total)} schools on the platform,{" "}
          {NUMBER.format(licensing.activeLicenses)} active licenses.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Schools"
          value={NUMBER.format(tenants.total)}
          hint={`${tenants.newLast30Days} added in the last 30 days`}
        />
        <StatTile
          label="Monthly recurring"
          value={CURRENCY.format(licensing.mrr)}
          hint="Annual licenses billed monthly"
        />
        <StatTile
          label="Collected revenue"
          value={CURRENCY.format(licensing.revenue)}
          hint="Paid platform invoices"
        />
        <StatTile
          label="Renewals due"
          value={NUMBER.format(licensing.expiringSoon)}
          hint="Licenses expiring within 30 days"
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Schools by status</h2>
          <ul className="mt-3 divide-y">
            {STATUS_ROWS.map((row) => {
              const count = tenants[row.key] as number;
              return (
                <li key={row.key} className="flex items-center gap-3 py-2">
                  <span className="w-24 text-sm text-muted-foreground">{row.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-sm">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Commercial</h2>
          <dl className="mt-3 divide-y">
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Active licenses</dt>
              <dd className="font-mono text-sm">{licensing.activeLicenses}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Invoices awaiting payment</dt>
              <dd className="font-mono text-sm">{licensing.dueInvoices}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Renewals due in 30 days</dt>
              <dd className="font-mono text-sm">{licensing.expiringSoon}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Monthly recurring revenue</dt>
              <dd className="font-mono text-sm">{CURRENCY.format(licensing.mrr)}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Collected revenue</dt>
              <dd className="font-mono text-sm">{CURRENCY.format(licensing.revenue)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
