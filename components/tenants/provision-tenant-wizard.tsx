"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import type { PlatformTier } from "@/lib/api/plan-types";
import type { PlatformMarket, PlatformProvisionResult } from "@/lib/api/provision-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

const STEPS = [
  { key: "school", label: "School" },
  { key: "plan", label: "Plan" },
  { key: "admin", label: "Administrator" },
  { key: "review", label: "Review" },
] as const;

/**
 * The markets the platform sells into. The backend holds the same table
 * (backend/src/platform/platform-markets.ts) and derives the currency and
 * timezone from it, so this list only decides what the operator sees.
 */
const MARKETS: PlatformMarket[] = [
  { code: "SD", name: "Sudan", nameAr: "السودان", currency: "SDG", timezone: "Africa/Khartoum", dialCode: "+249" },
  { code: "BH", name: "Bahrain", nameAr: "البحرين", currency: "BHD", timezone: "Asia/Bahrain", dialCode: "+973" },
  { code: "IQ", name: "Iraq", nameAr: "العراق", currency: "IQD", timezone: "Asia/Baghdad", dialCode: "+964" },
  { code: "KW", name: "Kuwait", nameAr: "الكويت", currency: "KWD", timezone: "Asia/Kuwait", dialCode: "+965" },
  { code: "OM", name: "Oman", nameAr: "عُمان", currency: "OMR", timezone: "Asia/Muscat", dialCode: "+968" },
  { code: "QA", name: "Qatar", nameAr: "قطر", currency: "QAR", timezone: "Asia/Qatar", dialCode: "+974" },
  { code: "SA", name: "Saudi Arabia", nameAr: "السعودية", currency: "SAR", timezone: "Asia/Riyadh", dialCode: "+966" },
  { code: "AE", name: "United Arab Emirates", nameAr: "الإمارات", currency: "AED", timezone: "Asia/Dubai", dialCode: "+971" },
];

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type FormState = {
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  countryCode: string;
  planCode: string;
  studentCount: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
};

const EMPTY: FormState = {
  name: "",
  nameAr: "",
  email: "",
  phone: "",
  countryCode: "SD",
  planCode: "",
  studentCount: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
};

export function ProvisionTenantWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [plans, setPlans] = React.useState<PlatformTier[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<PlatformProvisionResult | null>(null);

  const market = MARKETS.find((entry) => entry.code === form.countryCode) ?? MARKETS[0];
  const plan = plans.find((entry) => entry.code === form.planCode) ?? null;
  const students = Number(form.studentCount) || 0;
  const monthlyUsd = plan ? plan.price * (students > 0 ? students : 1) : 0;

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await systemApiFetch<PlatformTier[]>("/platform/plans");
        if (cancelled) return;
        const active = rows.filter((entry) => entry.isActive);
        setPlans(active);
        setForm((current) =>
          current.planCode
            ? current
            : { ...current, planCode: active.find((entry) => entry.code === "PRIMARY")?.code ?? active[0]?.code ?? "" },
        );
      } catch {
        // The plan list only narrows the choice; provisioning without one is valid.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const stepErrors = React.useMemo(() => {
    const errors: Record<number, string> = {};
    if (form.name.trim().length < 2) errors[0] = "Enter the school's name.";
    if (form.adminName.trim().length < 3) errors[2] = "Enter the administrator's name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail.trim()))
      errors[2] = "Enter a valid administrator email.";
    if (
      form.adminPassword.length < 8 ||
      !/[A-Za-z]/.test(form.adminPassword) ||
      !/\d/.test(form.adminPassword)
    )
      errors[2] = "Use at least 8 characters with a letter and a number.";
    return errors;
  }, [form]);

  async function provision() {
    setPending(true);
    setError(null);
    try {
      const created = await systemApiFetch<PlatformProvisionResult>(
        "/platform/tenants",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || undefined,
            countryCode: form.countryCode,
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            adminName: form.adminName.trim(),
            adminEmail: form.adminEmail.trim(),
            adminPhone: form.adminPhone.trim() || undefined,
            adminPassword: form.adminPassword,
            planCode: form.planCode || undefined,
            studentCount: students > 0 ? students : undefined,
          }),
        },
      );
      setResult(created);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The school could not be provisioned.",
      );
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <CircleCheck size={20} className="text-primary" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">School provisioned</h1>
        </div>
        <dl className="divide-y border-t">
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">School</dt>
            <dd className="text-sm">{result.tenant.name}</dd>
          </div>
          {result.tenant.nameAr ? (
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Name in Arabic</dt>
              <dd className="text-sm" dir="rtl">
                {result.tenant.nameAr}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Market</dt>
            <dd className="text-sm">
              {result.tenant.countryCode} Â· {result.tenant.currencyCode} Â·{" "}
              {result.tenant.timezone}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Administrator</dt>
            <dd className="text-sm">
              {result.admin.email}
              {result.admin.staffNumber ? (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {result.admin.staffNumber}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Portals enabled</dt>
            <dd className="font-mono text-sm">{result.modules.length}</dd>
          </div>
          {result.license ? (
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-muted-foreground">Monthly amount</dt>
              <dd className="font-mono text-sm">
                {USD.format(result.license.monthlyUsd)}{" "}
                <span className="text-xs text-muted-foreground">
                  {result.license.studentCount} students
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="text-sm text-muted-foreground">
          The administrator can sign in to the admin portal with the password you
          just set. Share it once, through a channel you trust.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/tenants/${result.tenant.id}`)}>
            Open the school
            <ArrowRight size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setResult(null);
              setForm(EMPTY);
              setStep(0);
            }}
          >
            Provision another school
          </Button>
          <Button variant="ghost" onClick={() => router.push("/tenants")}>
            Back to the directory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Provision a school</h1>
        <p className="text-sm text-muted-foreground">
          Creates the school, its first administrator, every portal, and the first
          license in one step.
        </p>
      </header>

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 border-y py-3 text-sm">
        {STEPS.map((entry, index) => {
          const state = index === step ? "current" : index < step ? "done" : "todo";
          return (
            <li key={entry.key} className="flex items-center gap-2">
              <span
                className={
                  state === "current"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }
              >
                {state === "done" ? (
                  <Check size={14} className="inline text-primary" aria-hidden />
                ) : (
                  <span className="font-mono text-xs">{index + 1}</span>
                )}
                <span className="ml-1.5">{entry.label}</span>
              </span>
              {index < STEPS.length - 1 ? (
                <span className="text-muted-foreground" aria-hidden>
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="school-name">School name (English)</Label>
            <Input
              id="school-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Springfield Academy"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="school-name-ar">School name (Arabic)</Label>
            <Input
              id="school-name-ar"
              dir="rtl"
              value={form.nameAr}
              onChange={(event) => update("nameAr", event.target.value)}
              placeholder="أكاديمية سبرينغفيلد"
            />
            <p className="text-xs text-muted-foreground">
              Optional. The English name is what the platform uses everywhere else.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-country">Country</Label>
            <NativeSelect
              id="school-country"
              value={form.countryCode}
              onChange={(event) => update("countryCode", event.target.value)}
            >
              {MARKETS.map((entry) => (
                <NativeSelectOption key={entry.code} value={entry.code}>
                  {entry.name} Â· {entry.nameAr}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-currency">Currency</Label>
            <Input id="school-currency" value={market.currency} readOnly />
            <p className="text-xs text-muted-foreground">
              Follows the country: {market.currency} in {market.timezone}.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-email">Contact email</Label>
            <Input
              id="school-email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="office@school.edu"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-phone">Contact phone</Label>
            <Input
              id="school-phone"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder={`${market.dialCode} 90 000 0001`}
            />
            <p className="text-xs text-muted-foreground">
              Country calling code {market.dialCode}.
            </p>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold">Plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The plan sets the price per student per month. The school gets every
              portal and every feature flag, and the licence covers the student
              count you enter.
            </p>
            {plans.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No active plans are defined yet - the school will start without a
                licence.
              </p>
            ) : (
              <ul className="mt-3 divide-y border-t">
                {plans.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-2">
                    <input
                      type="radio"
                      id={`plan-${entry.code}`}
                      name="plan"
                      value={entry.code}
                      checked={form.planCode === entry.code}
                      onChange={() => update("planCode", entry.code)}
                      className="size-4 accent-primary"
                    />
                    <label htmlFor={`plan-${entry.code}`} className="flex-1 text-sm">
                      {entry.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {entry.target}
                      </span>
                    </label>
                    <span className="font-mono text-sm">
                      {entry.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: entry.currency,
                        maximumFractionDigits: 0,
                      })}
                      <span className="ml-1 text-xs text-muted-foreground">
                        / student / month
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="student-count">Licensed students</Label>
            <Input
              id="student-count"
              type="number"
              min="0"
              step="1"
              value={form.studentCount}
              onChange={(event) => update("studentCount", event.target.value)}
              placeholder="400"
            />
            <p className="text-xs text-muted-foreground">
              {students > 0 && plan
                ? `Monthly amount: ${USD.format(monthlyUsd)} (${plan.price} per student)`
                : "The monthly amount follows from the plan price and this number."}
            </p>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid max-w-xl gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-name">Administrator name</Label>
            <Input
              id="admin-name"
              value={form.adminName}
              onChange={(event) => update("adminName", event.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Administrator email</Label>
            <Input
              id="admin-email"
              type="email"
              value={form.adminEmail}
              onChange={(event) => update("adminEmail", event.target.value)}
              placeholder="ada@school.edu"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-phone">Administrator phone</Label>
            <Input
              id="admin-phone"
              value={form.adminPhone}
              onChange={(event) => update("adminPhone", event.target.value)}
              placeholder={`${market.dialCode} 50 000 0000`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password">Temporary password</Label>
            <Input
              id="admin-password"
              type="password"
              value={form.adminPassword}
              onChange={(event) => update("adminPassword", event.target.value)}
              placeholder="At least 8 characters, with a letter and a number"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              The staff ID is issued automatically and shown on the next screen.
              Share the password once, through a channel you trust.
            </p>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">School</h2>
            <dl className="mt-3 divide-y border-t">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="text-sm">{form.name || "â€”"}</dd>
              </div>
              {form.nameAr ? (
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-sm text-muted-foreground">Name in Arabic</dt>
                  <dd className="text-sm" dir="rtl">
                    {form.nameAr}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Market</dt>
                <dd className="text-sm">
                  {market.name} Â· {market.currency}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Timezone</dt>
                <dd className="text-sm">{market.timezone}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Subscription &amp; access</h2>
            <dl className="mt-3 divide-y border-t">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Plan</dt>
                <dd className="text-sm">{plan?.name ?? "None"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Students</dt>
                <dd className="font-mono text-sm">{students || "â€”"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Monthly amount</dt>
                <dd className="font-mono text-sm">
                  {plan ? USD.format(monthlyUsd) : "â€”"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Administrator</dt>
                <dd className="text-sm">{form.adminEmail || "â€”"}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      {stepErrors[step] ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {stepErrors[step]}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            disabled={Boolean(stepErrors[step])}
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" disabled={pending} onClick={() => void provision()}>
            {pending ? "Provisioningâ€¦" : "Provision school"}
          </Button>
        )}
        <button
          type="button"
          onClick={() => router.push("/tenants")}
          className="ml-auto text-sm text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
