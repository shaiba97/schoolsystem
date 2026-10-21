"use client";

import * as React from "react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import {
  type PlatformCurrencyRow,
  type PlatformExpenseRow,
  type PlatformFinancialsOverview,
  type PlatformPaymentRow,
  type PlatformSubscriptionFinancial,
} from "@/lib/api/platform-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewPanel } from "@/components/financials/overview-panel";
import { SubscriptionsPanel } from "@/components/financials/subscriptions-panel";
import { CurrenciesPanel } from "@/components/financials/currencies-panel";
import { ExpensesPanel } from "@/components/financials/expenses-panel";

const TABS = ["overview", "subscriptions", "currencies", "expenses"] as const;
type TabKey = (typeof TABS)[number];

type Bundle = {
  overview: PlatformFinancialsOverview | null;
  subscriptions: PlatformSubscriptionFinancial[];
  currencies: PlatformCurrencyRow[];
  expenses: PlatformExpenseRow[];
};

const EMPTY: Bundle = {
  overview: null,
  subscriptions: [],
  currencies: [],
  expenses: [],
};

export function FinancialsClient() {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [data, setData] = React.useState<Bundle>(EMPTY);
  const [payments, setPayments] = React.useState<PlatformPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
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
      const [overview, subscriptions, currencies, expenses, paymentRows] =
        await Promise.all([
          systemApiFetch<PlatformFinancialsOverview>("/platform/financials/overview"),
          systemApiFetch<PlatformSubscriptionFinancial[]>(
            "/platform/financials/subscriptions",
          ),
          systemApiFetch<PlatformCurrencyRow[]>("/platform/financials/currencies"),
          systemApiFetch<PlatformExpenseRow[]>("/platform/financials/expenses"),
          systemApiFetch<PlatformPaymentRow[]>("/platform/financials/payments"),
        ]);
      setData({ overview, subscriptions, currencies, expenses });
      setPayments(paymentRows);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The platform financials API is unreachable.",
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
    window.history.replaceState(null, "", `/financials?tab=${value}`);
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Financial Affairs</h1>
        <p className="text-sm text-muted-foreground">
          Platform profitability, school subscriptions, exchange rates, and running
          costs. All figures convert to USD at the current rate.
        </p>
      </header>

      {actionError ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <div className="border-t border-destructive/40 pt-4">
          <p className="text-sm font-medium text-destructive">Financials unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => selectTab(String(value))}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">P&amp;L Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading && !data.overview ? (
            <div className="flex flex-col gap-2 pt-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <OverviewPanel overview={data.overview} />
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsPanel
            rows={data.subscriptions}
            payments={payments}
            currencies={data.currencies}
            isSuperAdmin={isSuperAdmin}
            onRecordPayment={(input) =>
              run(() =>
                systemApiFetch("/platform/financials/payments", {
                  method: "POST",
                  body: JSON.stringify(input),
                }),
              )
            }
            onIssueReceipt={(input) =>
              run(() =>
                systemApiFetch("/platform/financials/receipts", {
                  method: "POST",
                  body: JSON.stringify(input),
                }),
              )
            }
          />
        </TabsContent>

        <TabsContent value="currencies">
          <CurrenciesPanel
            rows={data.currencies}
            isSuperAdmin={isSuperAdmin}
            onUpdate={(code, input) =>
              run(() =>
                systemApiFetch(`/platform/financials/currencies/${code}`, {
                  method: "PATCH",
                  body: JSON.stringify(input),
                }),
              )
            }
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesPanel
            rows={data.expenses}
            isSuperAdmin={isSuperAdmin}
            onLog={(input) =>
              run(() =>
                systemApiFetch("/platform/financials/expenses", {
                  method: "POST",
                  body: JSON.stringify(input),
                }),
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
