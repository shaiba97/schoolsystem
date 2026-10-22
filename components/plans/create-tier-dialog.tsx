"use client";

import * as React from "react";
import { monthlyEquivalent } from "@/lib/api/plan-types";
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

const PORTALS = [
  "ADMIN",
  "ACADEMIC",
  "FINANCIAL",
  "TEACHER",
  "GUARDIAN",
  "STUDENT",
  "TRANSPORT",
  "RECEPTION",
];

const TIER_KINDS = [
  { value: "PRIMARY", label: "Primary" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "CUSTOM", label: "Customized" },
];

const USD_CENTS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Creates a new tier. A tier is billed yearly, so the term is a number of
 * days (365 is a year) and the price is what the school pays for the year.
 */
export function CreateTierDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [tier, setTier] = React.useState("CUSTOM");
  const [target, setTarget] = React.useState("");
  const [price, setPrice] = React.useState("0");
  const [durationDays, setDurationDays] = React.useState("365");
  const [modules, setModules] = React.useState<string[]>([...PORTALS]);
  const [error, setError] = React.useState<string | null>(null);

  const yearly = Number(price) || 0;

  function toggle(module: string) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((entry) => entry !== module)
        : [...current, module],
    );
  }

  function submit() {
    if (!/^[A-Z0-9][A-Z0-9_-]{1,59}$/.test(code.trim())) {
      setError(
        "The code may only contain uppercase letters, digits, hyphens, and underscores.",
      );
      return;
    }
    if (name.trim().length < 2) {
      setError("Give the tier a name.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      setError("The yearly price cannot be negative.");
      return;
    }
    if (!Number.isInteger(Number(durationDays)) || Number(durationDays) <= 0) {
      setError("The term must be a positive number of days.");
      return;
    }
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      tier,
      target: target.trim() || undefined,
      billingModel: "ANNUAL",
      price: yearly,
      currency: "USD",
      durationDays: Number(durationDays),
      includedModules: modules,
      features: {},
    });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a plan tier</DialogTitle>
          <DialogDescription>
            A tier is a yearly term with a yearly price. The tier decides what a
            school pays for; the portals it lists are the ones the school gets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-code">Code</Label>
              <Input
                id="tier-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="TIER-X"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-name">Name</Label>
              <Input
                id="tier-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tier X"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-kind">Tier kind</Label>
              <NativeSelect
                id="tier-kind"
                value={tier}
                onChange={(event) => setTier(event.target.value)}
              >
                {TIER_KINDS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-term">Term (days)</Label>
              <Input
                id="tier-term"
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-yearly">Yearly price (USD)</Label>
              <Input
                id="tier-yearly"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {yearly > 0
                  ? `${USD_CENTS.format(monthlyEquivalent(yearly))} a month, paid for the year.`
                  : "Zero means the tier is priced on request."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-term">One term (days)</Label>
              <Input
                id="tier-term"
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-audience">Audience line</Label>
            <Input
              id="tier-audience"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="School groups and multi-campus networks."
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
            Create tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
