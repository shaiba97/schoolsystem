"use client";

import * as React from "react";
import { ArrowUpRight, Lock, RefreshCw, Trash2 } from "lucide-react";
import type { PlatformSubscription, PlatformTier } from "@/lib/api/plan-types";
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
  onRenew: (tenantId: string, expiresAt?: string) => void;
  onTerminate: (tenantId: string) => void;
  onUpgrade: (tenantId: string, planId: string) => void;
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
              <TableHead>Term</TableHead>
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
          onSubmit={(expiresAt) => {
            onRenew(renewing.tenantId, expiresAt);
            setRenewing(null);
          }}
        />
      ) : null}

      {upgrading ? (
        <UpgradeDialog
          subscription={upgrading}
          tiers={tiers}
          onClose={() => setUpgrading(null)}
          onSubmit={(planId) => {
            onUpgrade(upgrading.tenantId, planId);
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
  onSubmit: (expiresAt?: string) => void;
}) {
  const [date, setDate] = React.useState("");

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew the subscription</DialogTitle>
          <DialogDescription>
            {subscription.name} is on {subscription.tier ?? "no tier"}. Leave the date
            empty to use the tier term
            {tier ? ` of ${tier.durationDays} days` : ""}. A date in the past ends
            the school immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-date">New end date</Label>
          <Input
            id="renew-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(date || undefined)}>
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
  onSubmit: (planId: string) => void;
}) {
  const [planId, setPlanId] = React.useState(
    tiers.find((tier) => tier.code !== subscription.tier)?.id ?? tiers[0]?.id ?? "",
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to another tier</DialogTitle>
          <DialogDescription>
            {subscription.name} moves from {subscription.tier ?? "no tier"}. The
            portals the new tier includes are switched on for the school.
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!planId} onClick={() => onSubmit(planId)}>
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
