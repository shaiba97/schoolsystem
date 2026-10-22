"use client";

import * as React from "react";
import { ArrowUpRight, Lock, RefreshCw, Trash2 } from "lucide-react";
import type { PlatformSubscription, PlatformTier } from "@/lib/api/plan-types";
import { monthlyEquivalent, termTotal } from "@/lib/api/plan-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_CENTS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The years a school may buy at once. A year is the shortest term. */
const TERM_YEARS = [1, 2, 3, 4, 5] as const;

const STATUS_VARIANT = {
  ACTIVE: "default",
  EXPIRING_SOON: "secondary",
  EXPIRED: "destructive",
  SUSPENDED: "destructive",
  NO_LICENSE: "outline",
} as const;

const LOCK_VARIANT = {
  ACTIVE: "outline",
  TERMINATED: "destructive",
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function remainingLabel(days: number | null) {
  if (days === null) return "no end date";
  if (days < 0) return `expired ${Math.abs(days)} days ago`;
  if (days === 0) return "ends today";
  return `in ${days} days`;
}

export function SubscriptionsTable({
  rows,
  tiers,
  isSuperAdmin,
  onRenew,
  onTerminate,
  onUpgrade,
}: {
  rows: PlatformSubscription[];
  tiers: PlatformTier[];
  isSuperAdmin: boolean;
  onRenew: (
    tenantId: string,
    expiresAt?: string,
    studentCount?: number,
    years?: number,
    yearlyPrice?: number,
  ) => void;
  onTerminate: (tenantId: string) => void;
  onUpgrade: (
    tenantId: string,
    planId: string,
    yearlyPrice?: number,
    years?: number,
  ) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [renewing, setRenewing] = React.useState<PlatformSubscription | null>(null);
  const [upgrading, setUpgrading] = React.useState<PlatformSubscription | null>(null);
  const [terminating, setTerminating] = React.useState<PlatformSubscription | null>(null);

  const filtered = rows.filter((row) => {
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      if (!row.name.toLowerCase().includes(needle) && !row.slug.toLowerCase().includes(needle)) {
        return false;
      }
    }
    if (tier && row.tier !== tier) return false;
    if (status && row.status !== status) return false;
    return true;
  });

  if (rows.length === 0) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        No school holds a subscription yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <label htmlFor="plans-search" className="sr-only">
            Search schools
          </label>
          <Input
            id="plans-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by school name"
          />
        </div>
        <NativeSelect
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          aria-label="Filter by plan tier"
        >
          <NativeSelectOption value="">All tiers</NativeSelectOption>
          {tiers.map((option) => (
            <NativeSelectOption key={option.id} value={option.code}>
              {option.code}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
          <NativeSelectOption value="EXPIRING_SOON">Expiring soon</NativeSelectOption>
          <NativeSelectOption value="EXPIRED">Expired</NativeSelectOption>
          <NativeSelectOption value="SUSPENDED">Suspended</NativeSelectOption>
          <NativeSelectOption value="NO_LICENSE">No license</NativeSelectOption>
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {rows.length} shown
        </p>
      </div>

      <div className="border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Term</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.tenantId}>
                <TableCell>
                  <span className="font-medium">{row.name}</span>
                  <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
                </TableCell>
                <TableCell>
                  {row.tier ? (
                    <Badge variant="outline">{row.tier}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.studentCount || "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.monthlyUsd ? (
                    <>
                      {USD_CENTS.format(row.monthlyUsd)}
                      <p className="text-xs font-normal text-muted-foreground">
                        {USD.format(row.yearlyPrice)} a year
                      </p>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.termYears ? (
                    <>
                      {row.termYears} {row.termYears === 1 ? "year" : "years"}
                      <p className="text-xs font-normal text-muted-foreground">
                        {USD.format(row.termTotal)} due
                      </p>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-mono">
                    {formatDate(row.startedAt)} → {formatDate(row.expiresAt)}
                  </span>
                  <p className="text-muted-foreground">{remainingLabel(row.daysRemaining)}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={LOCK_VARIANT[row.lockStatus]}>
                    {row.lockStatus === "TERMINATED" ? (
                      <Lock size={12} aria-hidden />
                    ) : null}
                    {row.lockStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {isSuperAdmin ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRenewing(row)}
                        >
                          <RefreshCw size={14} aria-hidden />
                          Renew
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setUpgrading(row)}
                        >
                          <ArrowUpRight size={14} aria-hidden />
                          Upgrade
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setTerminating(row)}
                        >
                          <Trash2 size={14} aria-hidden />
                          Terminate
                        </Button>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {renewing ? (
        <RenewDialog
          subscription={renewing}
          tier={tiers.find((row) => row.code === renewing.tier)}
          onClose={() => setRenewing(null)}
          onSubmit={(expiresAt, studentCount, years, yearlyPrice) => {
            onRenew(renewing.tenantId, expiresAt, studentCount, years, yearlyPrice);
            setRenewing(null);
          }}
        />
      ) : null}

      {upgrading ? (
        <UpgradeDialog
          subscription={upgrading}
          tiers={tiers}
          onClose={() => setUpgrading(null)}
          onSubmit={(planId, yearlyPrice, years) => {
            onUpgrade(upgrading.tenantId, planId, yearlyPrice, years);
            setUpgrading(null);
          }}
        />
      ) : null}

      {terminating ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : setTerminating(null))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Terminate this subscription</DialogTitle>
              <DialogDescription>
                {terminating.name} loses access to every portal immediately. The
                school keeps its data and can be restored by renewing.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTerminating(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onTerminate(terminating.tenantId);
                  setTerminating(null);
                }}
              >
                Terminate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function RenewDialog({
  subscription,
  tier,
  onClose,
  onSubmit,
}: {
  subscription: PlatformSubscription;
  tier?: PlatformTier;
  onClose: () => void;
  onSubmit: (
    expiresAt?: string,
    studentCount?: number,
    years?: number,
    yearlyPrice?: number,
  ) => void;
}) {
  const [date, setDate] = React.useState("");
  const [students, setStudents] = React.useState(
    String(subscription.studentCount || ""),
  );
  const [years, setYears] = React.useState(1);

  // The term runs a year from the renewal, so the default end date is shown
  // rather than left blank. It is computed outside the render pass, because
  // reading the clock during render is not a pure operation.
  const [defaultEnd, setDefaultEnd] = React.useState("");
  React.useEffect(() => {
    setDefaultEnd(
      new Date(
        Date.now() + (tier?.durationDays ?? 365) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10),
    );
  }, [tier?.durationDays]);

  const studentNumber = Number(students) || 0;
  // The licence's own rate, or the tier's, is what the renewal bills.
  const yearly = subscription.yearlyPrice || tier?.price || 0;
  const monthly = monthlyEquivalent(yearly);
  const due = termTotal(yearly, years);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew the subscription</DialogTitle>
          <DialogDescription>
            {subscription.name} is on {subscription.tier ?? "no tier"}. A term is
            whole years, and a year is the shortest one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-years">Term</Label>
          <div className="flex gap-1" role="group" aria-label="Term in years">
            {TERM_YEARS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={years === option ? "default" : "outline"}
                onClick={() => setYears(option)}
                aria-pressed={years === option}
              >
                {option} {option === 1 ? "year" : "years"}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            The new term ends {defaultEnd}. Leave the date below empty to use
            this.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-date">New end date</Label>
          <Input
            id="renew-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A date in the past ends the school immediately.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-students">Licensed students</Label>
          <Input
            id="renew-students"
            type="number"
            min="0"
            step="1"
            value={students}
            onChange={(event) => setStudents(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The size of the school, recorded against the licence.
          </p>
        </div>

        <dl className="divide-y border-t">
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Current students</dt>
            <dd className="font-mono text-sm">
              {subscription.studentCount || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Monthly equivalent</dt>
            <dd className="font-mono text-sm">
              {monthly ? USD_CENTS.format(monthly) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Due now</dt>
            <dd className="font-mono text-sm">{due ? USD.format(due) : "—"}</dd>
          </div>
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSubmit(
                date || undefined,
                studentNumber > 0 ? studentNumber : undefined,
                years,
                yearly || undefined,
              )
            }
          >
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpgradeDialog({
  subscription,
  tiers,
  onClose,
  onSubmit,
}: {
  subscription: PlatformSubscription;
  tiers: PlatformTier[];
  onClose: () => void;
  onSubmit: (planId: string, yearlyPrice?: number, years?: number) => void;
}) {
  const [planId, setPlanId] = React.useState(
    tiers.find((tier) => tier.code !== subscription.tier)?.id ?? tiers[0]?.id ?? "",
  );
  const [quoted, setQuoted] = React.useState("");
  const [years, setYears] = React.useState(1);
  const chosen = tiers.find((tier) => tier.id === planId);
  const students = subscription.studentCount || 0;
  // A quoted tier has no list price, so the operator states the yearly rate.
  const yearly = quoted ? Number(quoted) : (chosen?.price ?? 0);
  const monthly = monthlyEquivalent(yearly);
  const due = termTotal(yearly, years);
  const needsQuote = chosen ? chosen.price === 0 : false;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to another tier</DialogTitle>
          <DialogDescription>
            {subscription.name} moves from {subscription.tier ?? "no tier"}. The
            portals the new tier includes are switched on for the school, and the
            new term starts now.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upgrade-plan">New tier</Label>
          <NativeSelect
            id="upgrade-plan"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
          >
            {tiers.map((tier) => (
              <NativeSelectOption key={tier.id} value={tier.id}>
                {tier.name} ({tier.code})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upgrade-price">Yearly price{needsQuote ? " (quoted)" : ""}</Label>
          <Input
            id="upgrade-price"
            type="number"
            min="0"
            step="1"
            value={quoted}
            placeholder={chosen ? String(chosen.price) : "0"}
            onChange={(event) => setQuoted(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {needsQuote
              ? "This tier is priced on request, so set the agreed yearly rate here."
              : "Leave empty to use the tier's price."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upgrade-years">Term</Label>
          <div className="flex gap-1" role="group" aria-label="Term in years">
            {TERM_YEARS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={years === option ? "default" : "outline"}
                onClick={() => setYears(option)}
                aria-pressed={years === option}
              >
                {option} {option === 1 ? "year" : "years"}
              </Button>
            ))}
          </div>
        </div>

        <dl className="divide-y border-t">
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Licensed students</dt>
            <dd className="font-mono text-sm">{students || "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Monthly equivalent</dt>
            <dd className="font-mono text-sm">
              {monthly ? USD_CENTS.format(monthly) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Due now</dt>
            <dd className="font-mono text-sm">{due ? USD.format(due) : "—"}</dd>
          </div>
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!planId}
            onClick={() =>
              onSubmit(planId, quoted ? Number(quoted) : undefined, years)
            }
          >
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
