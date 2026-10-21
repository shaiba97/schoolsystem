"use client";

import * as React from "react";
import type { PlatformSubscriptionFinancial } from "@/lib/api/platform-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { PaymentInput } from "@/components/financials/subscriptions-panel";

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_API", label: "Bank API (pending)" },
] as const;

export function RecordPaymentDialog({
  subscription,
  onClose,
  onSubmit,
}: {
  subscription: PlatformSubscriptionFinancial;
  onClose: () => void;
  onSubmit: (input: PaymentInput) => void;
}) {
  const [amount, setAmount] = React.useState(
    String(Math.max(0, Math.round(subscription.outstanding ?? 0))),
  );
  const [currency, setCurrency] = React.useState(subscription.currency);
  const [method, setMethod] = React.useState<string>("BANK_TRANSFER");
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter the amount that was received.");
      return;
    }
    if (!paidAt) {
      setError("Enter the date the money arrived.");
      return;
    }
    onSubmit({
      tenantId: subscription.tenantId,
      licenseId: subscription.licenseId ?? undefined,
      amount: value,
      currency,
      method: method as PaymentInput["method"],
      paidAt: new Date(`${paidAt}T00:00:00Z`).toISOString(),
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Log what {subscription.name} paid for its {subscription.tier ?? "subscription"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Amount received</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-currency">Currency</Label>
            <Input
              id="payment-currency"
              value={currency}
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method">Method</Label>
            <NativeSelect
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {METHODS.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Date received</Label>
            <Input
              id="payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-reference">Reference</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transfer or deposit slip number"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-notes">Notes</Label>
            <Input
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
