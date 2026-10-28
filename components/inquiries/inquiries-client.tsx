"use client";

import * as React from "react";
import { Inbox, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ApiError, systemApiFetch } from "@/lib/api/client";
import {
  CONTACT_TYPE_LABELS,
  REGIONS,
  STATUSES,
  STATUS_BADGE,
  STATUS_LABELS,
  inquiryListPath,
  supportContactsPath,
  type ContactType,
  type InquiryPageData,
  type InquiryStatus,
  type LandingInquiry,
  type SupportContactPageData,
  type SupportContactRow,
} from "@/lib/api/support-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type TabKey = "inquiries" | "contacts";

const selectClasses =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus:border-ring";

function formattedDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: LandingInquiry["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATUS_BADGE[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function InquiriesClient() {
  const [tab, setTab] = React.useState<TabKey>("inquiries");
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("sys_roles");
      const roles = raw ? (JSON.parse(raw) as string[]) : [];
      setIsSuperAdmin(roles.includes("SUPER_ADMIN"));
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Inquiries &amp; Contacts</h1>
        <p className="text-sm text-muted-foreground">
          The landing page intake and the per-region support contacts directory.
        </p>
      </header>
      <TabsBar tab={tab} setTab={setTab} />
      {tab === "inquiries" ? (
        <InquiriesTab isSuperAdmin={isSuperAdmin} />
      ) : (
        <ContactsTab isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}

function TabsBar({ tab, setTab }: { tab: TabKey; setTab: (next: TabKey) => void }) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-muted p-1">
      {(
        [
          { key: "inquiries", label: "Landing inquiries" },
          { key: "contacts", label: "Support contacts" },
        ] as Array<{ key: TabKey; label: string }>
      ).map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => setTab(entry.key)}
          aria-pressed={tab === entry.key}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
            tab === entry.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}

function regionOption(value: string): string {
  const found = REGIONS.find(([key]) => key === value);
  return found ? found[1] : value;
}

type InquiryFilters = { status: string; region: string; search: string };

function InquiriesTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [filters, setFilters] = React.useState<InquiryFilters>({
    status: "PENDING",
    region: "",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [rows, setRows] = React.useState<LandingInquiry[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<LandingInquiry | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await systemApiFetch<InquiryPageData>(
        inquiryListPath({
          status: filters.status || undefined,
          region: filters.region || undefined,
          search: debouncedSearch || undefined,
        }),
      );
      setRows(page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The inquiries API is unreachable.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.region, debouncedSearch]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await systemApiFetch<InquiryPageData>(
        inquiryListPath({
          status: filters.status || undefined,
          region: filters.region || undefined,
          search: debouncedSearch || undefined,
          cursor: nextCursor,
        }),
      );
      setRows((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load more inquiries.");
    } finally {
      setLoadingMore(false);
    }
  }

  function changeFilter(next: Partial<InquiryFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  async function afterChange() {
    setDetail(null);
    await load();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inquiry-status" className="text-xs text-muted-foreground">Status</Label>
          <select
            id="inquiry-status"
            value={filters.status}
            onChange={(event) => changeFilter({ status: event.target.value })}
            className={selectClasses}
          >
            <option value="">All statuses</option>
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inquiry-region" className="text-xs text-muted-foreground">Region</Label>
          <select
            id="inquiry-region"
            value={filters.region}
            onChange={(event) => changeFilter({ region: event.target.value })}
            className={selectClasses}
          >
            <option value="">All regions</option>
            {REGIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor="inquiry-search" className="text-xs text-muted-foreground">Search</Label>
          <Input
            id="inquiry-search"
            value={filters.search}
            onChange={(event) => changeFilter({ search: event.target.value })}
            placeholder="Name, school, email, phone, text…"
            className="h-9"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading inquiries…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Inbox className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">No inquiries match these filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-start">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Received</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Contact</th>
                <th className="hidden px-4 py-2.5 text-start font-medium text-muted-foreground md:table-cell">School</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Region</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDetail(row)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-muted/60"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formattedDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.fullName}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </td>
                  <td className="hidden max-w-52 truncate px-4 py-3 md:table-cell">{row.schoolName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {regionOption(row.region)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && !loading ? (
        <div className="text-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Load more
          </Button>
        </div>
      ) : null}

      <InquiryDetailDialog
        row={detail}
        onClose={() => setDetail(null)}
        onDone={afterChange}
        isSuperAdmin={isSuperAdmin}
      />
    </section>
  );
}

function InquiryDetailDialog({
  row,
  onClose,
  onDone,
  isSuperAdmin,
}: {
  row: LandingInquiry | null;
  onClose: () => void;
  onDone: () => Promise<void>;
  isSuperAdmin: boolean;
}) {
  const [status, setStatus] = React.useState<InquiryStatus>("PENDING");
  const [subject, setSubject] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (row) {
      setStatus(row.status);
      setSubject(row.subject ?? "");
      setActionError(null);
      setConfirmDelete(false);
    }
  }, [row]);

  async function save() {
    if (!row) return;
    setSaving(true);
    setActionError(null);
    try {
      await systemApiFetch(`/inquiries/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          // Subject edits go back as text; clearing the box hides the line.
          subject: subject.trim() ? subject.trim() : null,
        }),
      });
      await onDone();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "The change could not be saved.",
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!row) return;
    setSaving(true);
    setActionError(null);
    try {
      await systemApiFetch(`/inquiries/${row.id}`, { method: "DELETE" });
      await onDone();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "The inquiry could not be deleted.",
      );
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{row?.fullName}</DialogTitle>
            <DialogDescription>
              {row ? `${row.schoolName} · ${regionOption(row.region)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p dir="ltr" className="text-sm">{row?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p dir="ltr" className="text-sm">{row?.phone}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
              {row?.message}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={row?.status ?? "PENDING"} />
              <span>received {row ? formattedDateTime(row.createdAt) : ""}</span>
              {row?.ipAddress ? <span dir="ltr">· ip {row.ipAddress}</span> : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="detail-status" className="text-sm">Status</Label>
                <select
                  id="detail-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                  className={cn(selectClasses, "w-full")}
                >
                  {STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-subject" className="text-sm">Subject</Label>
                <Input
                  id="detail-subject"
                  value={subject}
                  maxLength={200}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="One-line summary"
                  className="h-9"
                />
              </div>
            </div>
            {actionError ? (
              <p role="alert" className="text-sm text-destructive">{actionError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              disabled={!isSuperAdmin || saving}
              onClick={() => setConfirmDelete(true)}
              className="text-destructive"
            >
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving || !isSuperAdmin}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {row?.fullName}&apos;s request with it. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={saving || !isSuperAdmin}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type ContactFilters = { region: string; contactType: string; isActive: string };

function ContactsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [filters, setFilters] = React.useState<ContactFilters>({
    region: "",
    contactType: "",
    isActive: "",
  });
  const [rows, setRows] = React.useState<SupportContactRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<SupportContactRow | "NEW" | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await systemApiFetch<SupportContactPageData>(
        supportContactsPath({
          region: filters.region || undefined,
          contactType: filters.contactType || undefined,
          isActive: filters.isActive || undefined,
        }),
      );
      setRows(page.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The support contacts API is unreachable.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters.region, filters.contactType, filters.isActive]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ContactFilterSelect
          id="contact-region"
          label="Region"
          value={filters.region}
          onChange={(value) => setFilters((prev) => ({ ...prev, region: value }))}
          options={REGIONS.map(([value, label]) => ({ value, label }))}
          allLabel="All regions"
        />
        <ContactFilterSelect
          id="contact-type"
          label="Type"
          value={filters.contactType}
          onChange={(value) => setFilters((prev) => ({ ...prev, contactType: value }))}
          options={(Object.entries(CONTACT_TYPE_LABELS) as Array<[ContactType, string]>).map(
            ([value, label]) => ({ value, label }),
          )}
          allLabel="Email & phone"
        />
        <ContactFilterSelect
          id="contact-active"
          label="State"
          value={filters.isActive}
          onChange={(value) => setFilters((prev) => ({ ...prev, isActive: value }))}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
          allLabel="Any state"
        />
        <div className="ms-auto">
          <Button size="sm" disabled={!isSuperAdmin} onClick={() => setEditing("NEW")}>
            <Plus className="size-4" aria-hidden /> Add contact
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading contacts…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Inbox className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">
            No support contacts yet. Add one per region.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">Region</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td dir="ltr" className={cn("px-4 py-3 text-start", !row.isActive && "text-muted-foreground")}>
                    {row.contact}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CONTACT_TYPE_LABELS[row.contactType] ?? row.contactType}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {regionOption(row.region)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        row.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-end">
                    {isSuperAdmin ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                          <Pencil className="size-4" aria-hidden /> Edit
                        </Button>
                        <ContactDeleteButton row={row} onDone={load} />
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ContactEditDialog
        target={editing}
        onClose={() => setEditing(null)}
        onDone={load}
      />
    </section>
  );
}

function ContactFilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClasses}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function ContactDeleteButton({ row, onDone }: { row: SupportContactRow; onDone: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await systemApiFetch(`/support-contacts/${row.id}`, { method: "DELETE" });
      setOpen(false);
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The contact could not be deleted.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              <span dir="ltr">{row.contact}</span> ({regionOption(row.region)}) will no
              longer be offered as a support channel.
            </AlertDialogDescription>
            {error ? (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ContactEditDialog({
  target,
  onClose,
  onDone,
}: {
  target: SupportContactRow | "NEW" | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const isNew = target === "NEW";
  const row = target === "NEW" || target === null ? null : target;
  const [contact, setContact] = React.useState("");
  const [contactType, setContactType] = React.useState<ContactType>("EMAIL");
  const [region, setRegion] = React.useState<string>("SUDAN");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (target) {
      setContact(row?.contact ?? "");
      setContactType(row?.contactType ?? "EMAIL");
      setRegion(row?.region ?? "SUDAN");
      setIsActive(row?.isActive ?? true);
      setError(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on every open
  }, [target]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!contact.trim()) next.contact = "Enter the email address or phone number.";
    else if (contactType === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()))
      next.contact = "Enter a valid email address.";
    else if (contactType === "PHONE" && !/^\+?[0-9][0-9\s-]{6,29}$/.test(contact.trim()))
      next.contact = "Enter a valid phone number, e.g. +249 512 345 678.";
    if (!region) next.region = "Choose the target region.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await systemApiFetch("/support-contacts", {
          method: "POST",
          body: JSON.stringify({ contact: contact.trim(), contactType, region }),
        });
      } else if (row) {
        await systemApiFetch(`/support-contacts/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            contact: contact.trim(),
            contactType,
            region,
            isActive,
          }),
        });
      }
      await onDone();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The contact could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add support contact" : "Edit support contact"}</DialogTitle>
          <DialogDescription>
            One email address or phone number per region.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-value" className="text-sm">Contact</Label>
            <Input
              id="contact-value"
              dir="ltr"
              value={contact}
              maxLength={255}
              onChange={(event) => setContact(event.target.value)}
              placeholder={contactType === "EMAIL" ? "support@example.sd" : "+249 512 345 678"}
              className="h-9"
              aria-invalid={Boolean(fieldErrors.contact)}
            />
            {fieldErrors.contact ? (
              <p className="text-xs text-destructive">{fieldErrors.contact}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-type" className="text-sm">Type</Label>
              <select
                id="contact-type"
                value={contactType}
                onChange={(event) => {
                  const next = event.target.value as ContactType;
                  setContactType(next);
                  setFieldErrors({});
                }}
                className={cn(selectClasses, "w-full")}
              >
                {(Object.entries(CONTACT_TYPE_LABELS) as Array<[ContactType, string]>).map(
                  ([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-region-edit" className="text-sm">Region</Label>
              <select
                id="contact-region-edit"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className={cn(selectClasses, "w-full")}
                aria-invalid={Boolean(fieldErrors.region)}
              >
                {REGIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldErrors.region ? (
                <p className="text-xs text-destructive">{fieldErrors.region}</p>
              ) : null}
            </div>
          </div>
          {!isNew ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="size-4 rounded"
              />
              Active support channel
            </label>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
