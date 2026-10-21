"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import {
  PORTAL_MODULES,
  type PlatformPlan,
  type PlatformProvisionResult,
} from "@/lib/api/platform-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { key: "school", label: "School" },
  { key: "plan", label: "Plan & portals" },
  { key: "admin", label: "Administrator" },
  { key: "review", label: "Review" },
] as const;

const FEATURE_FLAGS = [
  { key: "portal.transport.tracking", label: "Transport tracking" },
  { key: "notifications.whatsapp", label: "WhatsApp notifications" },
  { key: "compliance.vat", label: "VAT compliance" },
  { key: "payments.bankak", label: "Bankak payments" },
  { key: "payments.mada_knet", label: "Mada and KNET payments" },
];

type FormState = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  planCode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  modules: string[];
  featureFlags: Record<string, boolean>;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  countryCode: "SD",
  currencyCode: "SDG",
  timezone: "Africa/Khartoum",
  planCode: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  modules: [...PORTAL_MODULES],
  featureFlags: Object.fromEntries(FEATURE_FLAGS.map((flag) => [flag.key, false])),
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProvisionTenantWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [plans, setPlans] = React.useState<PlatformPlan[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<PlatformProvisionResult | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await systemApiFetch<PlatformPlan[]>("/platform/plans");
        if (!cancelled) {
          setPlans(rows.filter((plan) => plan.isActive));
          setForm((current) =>
            current.planCode
              ? current
              : { ...current, planCode: rows.find((plan) => plan.isActive)?.code ?? "" },
          );
        }
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

  function toggleModule(module: string) {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(module)
        ? current.modules.filter((entry) => entry !== module)
        : [...current.modules, module],
    }));
  }

  function toggleFlag(key: string) {
    setForm((current) => ({
      ...current,
      featureFlags: { ...current.featureFlags, [key]: !current.featureFlags[key] },
    }));
  }

  const stepErrors = React.useMemo(() => {
    const errors: Record<number, string> = {};
    if (form.name.trim().length < 2) errors[0] = "Enter the school's name.";
    else if (form.slug && !/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(form.slug))
      errors[0] = "The slug may only contain lowercase letters, digits, and hyphens.";
    if (form.adminName.trim().length < 3) errors[2] = "Enter the administrator's name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail.trim()))
      errors[2] = "Enter a valid administrator email.";
    if (form.adminPassword.length < 8 || !/[A-Za-z]/.test(form.adminPassword) || !/\d/.test(form.adminPassword))
      errors[2] = "Use at least 8 characters with a letter and a number.";
    return errors;
  }, [form]);

  async function provision() {
    setPending(true);
    setError(null);
    try {
      const created = await systemApiFetch<PlatformProvisionResult>("/platform/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          countryCode: form.countryCode.trim().toUpperCase() || undefined,
          currencyCode: form.currencyCode.trim().toUpperCase() || undefined,
          timezone: form.timezone.trim() || undefined,
          adminName: form.adminName.trim(),
          adminEmail: form.adminEmail.trim(),
          adminPassword: form.adminPassword,
          planCode: form.planCode || undefined,
          modules: form.modules,
          featureFlags: form.featureFlags,
        }),
      });
      setResult(created);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The school could not be provisioned.",
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
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Slug</dt>
            <dd className="font-mono text-sm">{result.tenant.slug}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Administrator</dt>
            <dd className="text-sm">{result.admin.email}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">Portals enabled</dt>
            <dd className="font-mono text-sm">{result.modules.length}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">License</dt>
            <dd className="text-sm">{result.license?.planCode ?? "None"}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          The administrator can sign in to the admin portal with the password you just
          set. Share it once, through a channel you trust.
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
              setSlugTouched(false);
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
          Creates the tenant, its first administrator, the portal switches, and the
          first license in one step.
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
            <Label htmlFor="school-name">School name</Label>
            <Input
              id="school-name"
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  slug: slugTouched ? current.slug : slugify(name),
                }));
              }}
              placeholder="Springfield Academy"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-slug">Slug</Label>
            <Input
              id="school-slug"
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                update("slug", event.target.value);
              }}
              placeholder="springfield-academy"
            />
            <p className="text-xs text-muted-foreground">
              Used in the portal URL. Lowercase letters, digits, and hyphens.
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
            <Label htmlFor="school-phone">Phone</Label>
            <Input
              id="school-phone"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+249 90 000 0001"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-country">Country code</Label>
            <Input
              id="school-country"
              value={form.countryCode}
              maxLength={2}
              onChange={(event) => update("countryCode", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-currency">Currency</Label>
            <Input
              id="school-currency"
              value={form.currencyCode}
              maxLength={3}
              onChange={(event) => update("currencyCode", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school-timezone">Timezone</Label>
            <Input
              id="school-timezone"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
            />
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">Plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The plan decides the license the school starts with. It can be changed
              later from licensing.
            </p>
            {plans.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No active plans are defined yet — the school will start unlicensed.
              </p>
            ) : (
              <ul className="mt-3 divide-y border-t">
                {plans.map((plan) => (
                  <li key={plan.id} className="flex items-center gap-3 py-2">
                    <input
                      type="radio"
                      id={`plan-${plan.code}`}
                      name="plan"
                      value={plan.code}
                      checked={form.planCode === plan.code}
                      onChange={() => update("planCode", plan.code)}
                      className="size-4 accent-primary"
                    />
                    <label htmlFor={`plan-${plan.code}`} className="flex-1 text-sm">
                      {plan.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {plan.billingModel === "ANNUAL" ? "per year" : "one-off"}
                      </span>
                    </label>
                    <span className="font-mono text-sm">
                      {plan.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: plan.currency,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-sm font-semibold">Portals</h2>
              <ul className="mt-3 divide-y border-t">
                {PORTAL_MODULES.map((module) => (
                  <li key={module} className="flex items-center gap-3 py-2">
                    <Checkbox
                      id={`module-${module}`}
                      checked={form.modules.includes(module)}
                      onCheckedChange={() => toggleModule(module)}
                    />
                    <label
                      htmlFor={`module-${module}`}
                      className="text-sm capitalize"
                    >
                      {module.toLowerCase()}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold">Feature flags</h2>
              <ul className="mt-3 divide-y border-t">
                {FEATURE_FLAGS.map((flag) => (
                  <li key={flag.key} className="flex items-center gap-3 py-2">
                    <Checkbox
                      id={`flag-${flag.key}`}
                      checked={form.featureFlags[flag.key] ?? false}
                      onCheckedChange={() => toggleFlag(flag.key)}
                    />
                    <label htmlFor={`flag-${flag.key}`} className="text-sm">
                      {flag.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
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
              Share it once, through a channel you trust. The school admin can change
              it after the first sign-in.
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
                <dd className="text-sm">{form.name || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Slug</dt>
                <dd className="font-mono text-sm">{form.slug || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Country</dt>
                <dd className="text-sm">
                  {form.countryCode || "—"} · {form.currencyCode || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Plan</dt>
                <dd className="text-sm">
                  {plans.find((plan) => plan.code === form.planCode)?.name ?? "None"}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Access</h2>
            <dl className="mt-3 divide-y border-t">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Administrator</dt>
                <dd className="text-sm">{form.adminEmail || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Portals</dt>
                <dd className="text-sm">{form.modules.length} of {PORTAL_MODULES.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-muted-foreground">Feature flags</dt>
                <dd className="text-sm">
                  {Object.values(form.featureFlags).filter(Boolean).length} on
                </dd>
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
            {pending ? "Provisioning…" : "Provision school"}
          </Button>
        )}
        <Link href="/tenants" className="ml-auto text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}
