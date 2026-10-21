"use client";

import * as React from "react";
import { PlayCircle } from "lucide-react";
import type { PlatformExpirationResult } from "@/lib/api/plan-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="flex flex-col gap-1 border-t px-1 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-mono text-2xl leading-tight tracking-tight ${
          tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-600 dark:text-amber-500" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PlansOverview({
  active,
  expiring,
  locked,
  total,
  sweep,
  isSuperAdmin,
  onRunSweep,
}: {
  active: number;
  expiring: number;
  locked: number;
  total: number;
  sweep: PlatformExpirationResult | null;
  isSuperAdmin: boolean;
  onRunSweep: () => void;
}) {
  const [pending, setPending] = React.useState(false);

  return (
    <div className="flex flex-col gap-8 pt-4">
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="Active subscriptions"
          value={active}
          hint={`${total} schools on the platform`}
        />
        <Metric
          label="Expiring soon"
          value={expiring}
          hint="Term ends within 30 days"
          tone={expiring > 0 ? "warning" : undefined}
        />
        <Metric
          label="Terminated / locked"
          value={locked}
          hint="Locked out of every portal"
          tone={locked > 0 ? "danger" : undefined}
        />
      </section>

      <section className="border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Expiration audit</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ends licences whose term has run out and locks the school. The same
              sweep runs nightly at 03:00 UTC; this button runs it now.
            </p>
          </div>
          {isSuperAdmin ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setPending(true);
                onRunSweep();
                setPending(false);
              }}
            >
              <PlayCircle size={14} aria-hidden />
              {pending ? "Running…" : "Trigger expiration audit"}
            </Button>
          ) : null}
        </div>

        {sweep ? (
          <div className="mt-3 border-t pt-3">
            <p className="text-sm">
              Sweep finished at{" "}
              <span className="font-mono text-xs">
                {new Date(sweep.ranAt).toISOString().replace("T", " ").slice(0, 16)}
              </span>
              {" — "}
              <span className="font-mono">{sweep.expired}</span> licence(s) ended.
            </p>
            {sweep.schools.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {sweep.schools.map((school) => (
                  <li key={school.tenantId}>
                    <Badge variant="destructive">{school.name}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
