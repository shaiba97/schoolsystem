"use client";

import * as React from "react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import type {
  PlatformExpirationResult,
  PlatformSubscription,
  PlatformTier,
} from "@/lib/api/plan-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PlansOverview } from "@/components/plans/plans-overview";
import { SubscriptionsTable } from "@/components/plans/subscriptions-table";
import { TierCards } from "@/components/plans/tier-cards";
import { CreateTierDialog } from "@/components/plans/create-tier-dialog";

const TABS = ["overview", "subscriptions", "tiers"] as const;
type TabKey = (typeof TABS)[number];

export function PlansClient() {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [tiers, setTiers] = React.useState<PlatformTier[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<PlatformSubscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [sweep, setSweep] = React.useState<PlatformExpirationResult | null>(null);
  const [creatingTier, setCreatingTier] = React.useState(false);
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

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tierRows, subscriptionRows] = await Promise.all([
        systemApiFetch<PlatformTier[]>("/platform/plans"),
        systemApiFetch<PlatformSubscription[]>("/platform/plans/subscriptions"),
      ]);
      setTiers(tierRows);
      setSubscriptions(subscriptionRows);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The platform plans API is unreachable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function selectTab(next: string) {
    const value = (TABS as readonly string[]).includes(next) ? (next as TabKey) : "overview";
    setTab(value);
    window.history.replaceState(null, "", `/plans?tab=${value}`);
  }

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "The change could not be saved.");
    }
  }

  const active = subscriptions.filter((row) => row.status === "ACTIVE").length;
  const expiring = subscriptions.filter((row) => row.status === "EXPIRING_SOON").length;
  const locked = subscriptions.filter((row) => row.lockStatus === "TERMINATED").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Plans &amp; Subscription</h1>
        <p className="text-sm text-muted-foreground">
          The tier catalogue and every school&apos;s subscription. A school whose term
          ends is locked out of all portals until it is renewed.
        </p>
      </header>

      {actionError ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <div className="border-t border-destructive/40 pt-4">
          <p className="text-sm font-medium text-destructive">Plans unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => selectTab(String(value))}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="tiers">Plan tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading && subscriptions.length === 0 ? (
            <div className="flex flex-col gap-2 pt-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <PlansOverview
            active={active}
            expiring={expiring}
            locked={locked}
            total={subscriptions.length}
            sweep={sweep}
            isSuperAdmin={isSuperAdmin}
              onRunSweep={() =>
              run(async () => {
                const result = await systemApiFetch<PlatformExpirationResult>(
                  "/platform/plans/expiration-audit",
                  { method: "POST" },
                );
                setSweep(result);
              })
            }
            />
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTable
            rows={subscriptions}
            tiers={tiers}
            isSuperAdmin={isSuperAdmin}
            onRenew={(tenantId, expiresAt, studentCount, years, yearlyPrice) =>
              run(() =>
                systemApiFetch(`/platform/plans/subscriptions/${tenantId}/renew`, {
                  method: "POST",
                  body: JSON.stringify({
                    ...(expiresAt ? { expiresAt } : {}),
                    ...(studentCount ? { studentCount } : {}),
                    ...(years ? { years } : {}),
                    ...(yearlyPrice ? { yearlyPrice } : {}),
                  }),
                }),
              )
            }
            onTerminate={(tenantId) =>
              run(() =>
                systemApiFetch(`/platform/plans/subscriptions/${tenantId}/terminate`, {
                  method: "POST",
                }),
              )
            }
            onUpgrade={(tenantId, planId, yearlyPrice, years) =>
              run(() =>
                systemApiFetch(`/platform/plans/subscriptions/${tenantId}/upgrade`, {
                  method: "POST",
                  body: JSON.stringify({
                    planId,
                    ...(yearlyPrice ? { yearlyPrice } : {}),
                    ...(years ? { years } : {}),
                  }),
                }),
              )
            }
          />
        </TabsContent>

        <TabsContent value="tiers">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              The tiers a school can be on. Each is a yearly term with a flat
              yearly price.
            </p>
            {isSuperAdmin ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCreatingTier(true)}
              >
                <Plus size={14} aria-hidden />
                Create tier
              </Button>
            ) : null}
          </div>
          <TierCards
            tiers={tiers}
            isSuperAdmin={isSuperAdmin}
            onUpdate={(id, input) =>
              run(() =>
                systemApiFetch(`/platform/plans/${id}`, {
                  method: "PATCH",
                  body: JSON.stringify(input),
                }),
              )
            }
            onDelete={(id) =>
              run(() =>
                systemApiFetch(`/platform/plans/${id}`, {
                  method: "DELETE",
                }),
              )
            }
          />
          {creatingTier ? (
            <CreateTierDialog
              onClose={() => setCreatingTier(false)}
              onSubmit={(input) => {
                setCreatingTier(false);
                void run(() =>
                  systemApiFetch("/platform/plans", {
                    method: "POST",
                    body: JSON.stringify(input),
                  }),
                );
              }}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
