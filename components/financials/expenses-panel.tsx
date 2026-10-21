"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { PlatformExpenseRow } from "@/lib/api/platform-types";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORIES = [
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "MARKETING", label: "Marketing" },
  { value: "LEGAL", label: "Legal" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Other" },
] as const;

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type ExpenseInput = {
  title: string;
  category: string;
  countryCode?: string | null;
  amount: number;
  currency: string;
  paidAt: string;
  notes?: string;
};

export function ExpensesPanel({
  rows,
  isSuperAdmin,
  onLog,
}: {
  rows: PlatformExpenseRow[];
  isSuperAdmin: boolean;
  onLog: (input: ExpenseInput) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<string>("INFRASTRUCTURE");
  const [countryCode, setCountryCode] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    const value = Number(amount);
    if (!title.trim()) {
      setError("Give the cost a title.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter the amount that was paid.");
      return;
    }
    onLog({
      title: title.trim(),
      category,
      countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : null,
      amount: value,
      currency: currency.trim().toUpperCase() || "USD",
      paidAt: new Date(`${paidAt}T00:00:00Z`).toISOString(),
      notes: notes.trim() || undefined,
    });
    setOpen(false);
    setTitle("");
    setAmount("");
    setNotes("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Running costs of running the platform. A cost with no country is global and
          is not charged to any single market.
        </p>
        {isSuperAdmin ? (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} aria-hidden />
            Log platform expense
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          No platform cost has been logged yet.
        </p>
      ) : (
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium">{row.title}</span>
                    {row.notes ? (
                      <p className="text-xs text-muted-foreground">{row.notes}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row.category.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.countryCode ?? "GLOBAL"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.currency === "USD"
                      ? USD.format(row.amount)
                      : `${row.amount.toLocaleString("en-US")} ${row.currency}`}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(row.paidAt).toISOString().slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {open ? (
        <Dialog open onOpenChange={(next) => (next ? undefined : setOpen(false))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log a platform expense</DialogTitle>
              <DialogDescription>
                Record what the platform costs to run. Leave the country empty for a
                global cost.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-title">Title</Label>
                <Input
                  id="expense-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="AWS Server Hosting"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-category">Category</Label>
                <NativeSelect
                  id="expense-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-country">Country allocation</Label>
                <Input
                  id="expense-country"
                  value={countryCode}
                  maxLength={2}
                  onChange={(event) => setCountryCode(event.target.value)}
                  placeholder="Leave empty for global"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-currency">Currency</Label>
                <Input
                  id="expense-currency"
                  value={currency}
                  maxLength={3}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-date">Date paid</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expense-notes">Notes</Label>
                <Input
                  id="expense-notes"
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submit}>
                Log expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
