"use client";

import type { PlatformFinancialsOverview } from "@/lib/api/platform-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const LOCAL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1 border-t px-1 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-mono text-2xl leading-tight tracking-tight ${
          tone === "negative" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function OverviewPanel({
  overview,
}: {
  overview: PlatformFinancialsOverview | null;
}) {
  if (!overview) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        No financial data has been recorded yet.
      </p>
    );
  }

  const { totals, countries } = overview;
  const negative = totals.netProfit < 0;

  return (
    <div className="flex flex-col gap-8 pt-4">
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Platform revenue"
          value={USD.format(totals.revenue)}
          hint={`${totals.paymentCount} payments received`}
        />
        <Metric
          label="Platform expenses"
          value={USD.format(totals.expenses)}
          hint={`${totals.expenseCount} costs logged`}
        />
        <Metric
          label="Net profit"
          value={USD.format(totals.netProfit)}
          hint={`${totals.marginPct}% margin`}
          tone={negative ? "negative" : undefined}
        />
        <Metric
          label="Markets with income"
          value={String(countries.filter((row) => row.localIncome > 0).length)}
          hint={`${countries.length} currencies supported`}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold">Country breakdown</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Local income and costs per market, with the net converted to USD at the
          current rate. A global cost is not charged to any single market.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {countries.map((country) => (
            <li key={country.countryCode} className="flex flex-col gap-1 border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {country.countryCode}
                </span>
                <span className="text-xs text-muted-foreground">{country.currency}</span>
              </div>
              <p className="font-mono text-lg">
                {LOCAL.format(country.localIncome)}
                <span className="ml-1 text-xs text-muted-foreground">income</span>
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {LOCAL.format(country.localExpenses)} expenses
              </p>
              <p
                className={`font-mono text-sm ${
                  country.netProfitUsd < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {USD.format(country.netProfitUsd)} net
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Consolidated P&amp;L</h2>
        <div className="mt-3 border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Revenue (USD)</TableHead>
                <TableHead className="text-right">Costs (USD)</TableHead>
                <TableHead className="text-right">Net (USD)</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((country) => (
                <TableRow key={country.countryCode}>
                  <TableCell className="font-mono text-xs">
                    {country.countryCode}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {country.currency}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {USD.format(country.localIncome / country.rateToUsd)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {USD.format(country.localExpenses / country.rateToUsd)}
                  </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        country.netProfitUsd < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {USD.format(country.netProfitUsd)}
                    </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {country.marginPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
