export type PlatformTier = {
  id: string;
  code: string;
  name: string;
  tier: string | null;
  target: string | null;
  /** A tier is always billed yearly; the term length is durationDays. */
  billingModel: "ANNUAL";
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
  /** Price per student per month, in the tier's own currency. */
  price: number | null;
  currency: string;
  /** Students the licence covers. */
  studentCount: number;
  /** The monthly amount: price per student times the licensed students. */
  monthlyUsd: number;
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
