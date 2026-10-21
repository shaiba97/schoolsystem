export type PlatformTier = {
  id: string;
  code: string;
  name: string;
  tier: string | null;
  target: string | null;
  billingModel: "ANNUAL" | "LIFETIME";
  price: number;
  priceMax: number | null;
  currency: string;
  durationDays: number;
  sortOrder: number;
  includedModules: string[];
  features: Record<string, boolean | number | string>;
  isActive: boolean;
};

export type PlatformSubscription = {
  tenantId: string;
  name: string;
  slug: string;
  countryCode: string | null;
  currencyCode: string;
  logoUrl: string | null;
  tenantStatus: string;
  licenseId: string | null;
  tier: string | null;
  tierName: string | null;
  tierLabel: string | null;
  price: number | null;
  currency: string;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED" | "NO_LICENSE";
  lockStatus: "ACTIVE" | "TERMINATED";
  lockReason: string | null;
  lockedAt: string | null;
};

export type PlatformExpirationResult = {
  ranAt: string;
  expired: number;
  schools: Array<{ tenantId: string; name: string; expiredAt: string | null }>;
};
