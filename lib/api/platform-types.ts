export type PlatformStats = {
  tenants: {
    total: number;
    ACTIVE: number;
    TRIAL: number;
    PENDING: number;
    SUSPENDED: number;
    ARCHIVED: number;
    newLast30Days: number;
  };
  licensing: {
    activeLicenses: number;
    mrr: number;
    revenue: number;
    dueInvoices: number;
    expiringSoon: number;
  };
};

export type PlatformPlanSummary = {
  id: string;
  code: string;
  name: string;
  billingModel: "ANNUAL" | "LIFETIME";
  price: number;
  currency: string;
};

export type PlatformTenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "TRIAL" | "PENDING" | "SUSPENDED" | "ARCHIVED";
  email: string | null;
  countryCode: string | null;
  currencyCode: string;
  timezone: string;
  createdAt: string;
  users: number;
  enabledModules: number;
  plan: PlatformPlanSummary | null;
  license: { id: string; status: string; expiresAt: string | null } | null;
};

export type PlatformTenantList = {
  items: PlatformTenantListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type PlatformTenantDetail = {
  id: string;
  name: string;
  slug: string;
  status: PlatformTenantListItem["status"];
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  currencyCode: string;
  timezone: string;
  weekendDays: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
  licenses: Array<
    {
      id: string;
      status: string;
      startedAt: string;
      expiresAt: string | null;
      seats: number | null;
      notes: string | null;
      plan: PlatformPlanSummary;
    }
  >;
  modules: Array<{ id: string; module: string; enabled: boolean }>;
  featureFlags: Array<{ id: string; key: string; enabled: boolean }>;
  counts: { users: number; students: number; teachers: number };
  invoices: Array<{
    id: string;
    number: string;
    kind: string;
    status: string;
    amount: number;
    currency: string;
    issuedAt: string;
    paidAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    actorId: string | null;
    createdAt: string;
    oldValues: unknown;
    newValues: unknown;
  }>;
};

export const PORTAL_MODULES = [
  "ADMIN",
  "ACADEMIC",
  "FINANCIAL",
  "TEACHER",
  "GUARDIAN",
  "STUDENT",
  "TRANSPORT",
] as const;

export type PortalModuleName = (typeof PORTAL_MODULES)[number];

export type PlatformAuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  actorId: string | null;
  actorName: string | null;
  ipAddress: string | null;
  createdAt: string;
  oldValues: unknown;
  newValues: unknown;
};

export type PlatformAuditList = {
  items: PlatformAuditEntry[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type PlatformAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  isActive: boolean;
  publishedAt: string;
  createdAt: string;
  author: string | null;
};

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  billingModel: "ANNUAL" | "LIFETIME";
  price: number;
  currency: string;
  isActive: boolean;
};

export type PlatformProvisionResult = {
  tenant: { id: string; name: string; slug: string; status: string };
  admin: { id: string; email: string; firstName: string; lastName: string | null };
  license: { id: string; planCode: string | null } | null;
  modules: string[];
  featureFlags: Record<string, boolean>;
};
