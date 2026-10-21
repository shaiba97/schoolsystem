"use client";

import * as React from "react";
import {
  Banknote,
  FileText,
  History,
  Plus,
} from "lucide-react";
import type {
  PlatformPaymentRow,
  PlatformSubscriptionFinancial,
} from "@/lib/api/platform-types";
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
import { RecordPaymentDialog } from "@/components/financials/record-payment-dialog";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const LOCAL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const STATUS_VARIANT = {
  PAID: "default",
  PARTIAL: "secondary",
  OVERDUE: "destructive",
  UNPRICED: "outline",
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

export type PaymentInput = {
  tenantId: string;
  licenseId?: string;
  amount: number;
  currency: string;
  method: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "BANK_API";
  paidAt: string;
  reference?: string;
  notes?: string;
};

export function SubscriptionsPanel({
  rows,
  payments,
  isSuperAdmin,
  onRecordPayment,
  onIssueReceipt,
}: {
  rows: PlatformSubscriptionFinancial[];
  payments: PlatformPaymentRow[];
  isSuperAdmin: boolean;
  onRecordPayment: (input: PaymentInput) => void;
  onIssueReceipt: (input: {
    tenantId: string;
    licenseId?: string;
    amount: number;
    currency: string;
  }) => void;
}) {
  const [paying, setPaying] = React.useState<PlatformSubscriptionFinancial | null>(null);
  const [history, setHistory] = React.useState<PlatformSubscriptionFinancial | null>(null);

  if (rows.length === 0) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        No schools hold a license yet, so there is nothing to bill.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Local price</TableHead>
              <TableHead className="text-right">USD</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.tenantId}>
                <TableCell>
                  <span className="font-medium">{row.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {row.countryCode ?? "—"} · {row.currency}
                  </p>
                </TableCell>
                <TableCell>
                  {row.tier ? (
                    <Badge variant="outline">{row.tier}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No license</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.localPrice === null ? (
                    <span
                      className="text-xs text-muted-foreground"
                      title="This school bills in a currency with no configured rate"
                    >
                      no rate for {row.currency}
                    </span>
                  ) : (
                    <>
                      {LOCAL.format(row.localPrice)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.currency}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {USD.format(row.priceUsd)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(row.startedAt)} → {formatDate(row.expiresAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                  {row.paymentType ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.paymentType.replace(/_/g, " ").toLowerCase()}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {isSuperAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPaying(row)}
                      >
                        <Plus size={14} aria-hidden />
                        Payment
                      </Button>
                    ) : null}
                    {isSuperAdmin && row.licenseId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onIssueReceipt({
                            tenantId: row.tenantId,
                            licenseId: row.licenseId ?? undefined,
                            amount: row.paidAmount || row.priceUsd,
                            currency: row.currency,
                          })
                        }
                      >
                        <FileText size={14} aria-hidden />
                        Receipt
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setHistory(row)}
                    >
                      <History size={14} aria-hidden />
                      History
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {paying ? (
        <RecordPaymentDialog
          subscription={paying}
          onClose={() => setPaying(null)}
          onSubmit={(input) => {
            onRecordPayment(input);
            setPaying(null);
          }}
        />
      ) : null}

      {history ? (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold">Payments for {history.name}</h3>
          </div>
          {payments.filter((payment) => payment.tenantId === history.tenantId).length ===
          0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No payment has been recorded for this school yet.
            </p>
          ) : (
            <ul className="mt-2 divide-y border-t">
              {payments
                .filter((payment) => payment.tenantId === history.tenantId)
                .map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center gap-3 py-2 text-sm"
                  >
                    <span className="font-mono">
                      {LOCAL.format(payment.amount)} {payment.currency}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {payment.method.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(payment.paidAt)}
                    </span>
                    {payment.reference ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {payment.reference}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
