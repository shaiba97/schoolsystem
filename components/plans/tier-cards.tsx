"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { PlatformTier } from "@/lib/api/plan-types";
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

const PORTALS = [
  "ADMIN",
  "ACADEMIC",
  "FINANCIAL",
  "TEACHER",
  "GUARDIAN",
  "STUDENT",
  "TRANSPORT",
];

/** Human labels for the feature keys the catalogue grants. */
const FEATURE_LABELS: Record<string, string> = {
  standardAttendance: "Standard attendance",
  timetable: "Timetable",
  examinations: "Examinations",
  reportCards: "Basic report cards",
  guardianPortal: "Guardian portal",
  whatsappAttendance: "WhatsApp attendance",
  smsAttendance: "SMS attendance",
  financialInstallments: "Financial installments",
  payroll: "Payroll",
  busTracking: "Real-time bus tracking",
  gccTaxReceipts: "ZATCA / GCC tax receipts",
  bespokeConfiguration: "Bespoke configuration",
  databaseIsolation: "Database isolation",
  dedicatedSla: "Dedicated SLA",
};

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function priceLabel(tier: PlatformTier) {
  if (tier.priceMax) {
    return `${USD.format(tier.price)} – ${USD.format(tier.priceMax)}`;
  }
  if (tier.price === 0) return "Quote based";
  return USD.format(tier.price);
}

export function TierCards({
  tiers,
  isSuperAdmin,
  onUpdate,
  onDelete,
}: {
  tiers: PlatformTier[];
  isSuperAdmin: boolean;
  onUpdate: (id: string, input: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState<PlatformTier | null>(null);
  const [deleting, setDeleting] = React.useState<PlatformTier | null>(null);

  if (tiers.length === 0) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        No tiers are defined yet. Run the plan seed to load the catalogue.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {tiers.map((tier) => (
          <li key={tier.id} className="flex flex-col gap-3 border-t pt-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{tier.name}</h3>
                <p className="text-xs text-muted-foreground">{tier.target}</p>
              </div>
              <Badge variant="outline">{tier.code}</Badge>
            </div>

            <p className="font-mono text-lg">{priceLabel(tier)}</p>
            <p className="text-xs text-muted-foreground">
              {tier.price > 0 ? "per student / month" : "price on request"} ·{" "}
              {tier.billingModel === "ANNUAL"
                ? `${tier.durationDays} day term, then it ends`
                : `one-off, ${tier.durationDays} day term`}
            </p>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Portals
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {PORTALS.map((portal) => {
                  const included = tier.includedModules.includes(portal);
                  return (
                    <Badge
                      key={portal}
                      variant={included ? "default" : "outline"}
                      className={included ? "" : "text-muted-foreground opacity-60"}
                    >
                      {portal.toLowerCase()}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Features
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {Object.entries(tier.features).map(([key, value]) => (
                  <li key={key}>
                    <Badge variant="secondary">
                      {FEATURE_LABELS[key] ?? key}
                      {typeof value === "number" ? `: ${value}` : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            {isSuperAdmin ? (
              <div className="mt-auto flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(tier)}>
                  <Pencil size={14} aria-hidden />
                  Edit tier features &amp; limits
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleting(tier)}
                >
                  <Trash2 size={14} aria-hidden />
                  Delete
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {editing ? (
        <EditTierDialog
          tier={editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) => {
            onUpdate(editing.id, input);
            setEditing(null);
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteTierDialog
          tier={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DeleteTierDialog({
  tier,
  onClose,
  onConfirm,
}: {
  tier: PlatformTier;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {tier.name}</DialogTitle>
          <DialogDescription>
            The {tier.code} tier is removed from the catalogue. A tier that any
            school still holds cannot be deleted - move those schools to another
            tier first.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-1 border-t pt-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Tier</dt>
            <dd className="font-mono text-xs">{tier.code}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-sm">{priceLabel(tier)}</dd>
          </div>
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTierDialog({
  tier,
  onClose,
  onSubmit,
}: {
  tier: PlatformTier;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const [price, setPrice] = React.useState(String(tier.price));
  const [priceMax, setPriceMax] = React.useState(
    tier.priceMax === null ? "" : String(tier.priceMax),
  );
  const [durationDays, setDurationDays] = React.useState(String(tier.durationDays));
  const [target, setTarget] = React.useState(tier.target ?? "");
  const [modules, setModules] = React.useState<string[]>(tier.includedModules);

  function toggle(module: string) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((entry) => entry !== module)
        : [...current, module],
    );
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {tier.name}</DialogTitle>
          <DialogDescription>
            Price, term, audience line, and the portals this tier grants.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-price">Price per student / month (USD)</Label>
              <Input
                id="tier-price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A school&apos;s monthly amount is this price times its licensed
                students.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-price-max">Price ceiling</Label>
              <Input
                id="tier-price-max"
                type="number"
                min="0"
                step="1"
                value={priceMax}
                onChange={(event) => setPriceMax(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-duration">Term (days)</Label>
            <Input
              id="tier-duration"
              type="number"
              min="1"
              step="1"
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              365 gives a year. The licence ends on this date and the school is
              locked until it is renewed.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-target">Audience line</Label>
            <Input
              id="tier-target"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>

          <div>
            <p className="text-xs font-medium">Included portals</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {PORTALS.map((portal) => (
                <Button
                  key={portal}
                  type="button"
                  size="sm"
                  variant={modules.includes(portal) ? "default" : "outline"}
                  onClick={() => toggle(portal)}
                >
                  {portal.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSubmit({
                price: Number(price) || 0,
                priceMax: priceMax ? Number(priceMax) : null,
                durationDays: Number(durationDays) || 365,
                target: target.trim() || null,
                includedModules: modules,
              })
            }
          >
            Save tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
