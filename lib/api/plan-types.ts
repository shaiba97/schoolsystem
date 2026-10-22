export type PlatformTier = {
  id: string;
  code: string;
  name: string;
  tier: string | null;
  target: string | null;
  /** A tier is always billed yearly; the term length is durationDays. */
  billingModel: "ANNUAL";
  /** The flat yearly price a school pays. */
  price: number;
  /** The monthly equivalent of the yearly price. */
  monthlyPrice: number;
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
  /** The yearly rate the licence bills. */
  yearlyPrice: number;
  /** The monthly equivalent of the yearly rate. */
  monthlyPrice: number;
  /** How many years the term runs for. */
  termYears: number | null;
  /** What the whole term costs: the yearly rate times the years. */
  termTotal: number;
  currency: string;
  /** Students the licence covers. */
  studentCount: number;
  /** The monthly amount in the tier's own currency. */
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

/**
 * The monthly equivalent of a yearly price: 800 a year is 66.67 a month.
 *
 * The server derives the same number, so the console computes it only to
 * show what a term will cost before it is saved.
 */
export function monthlyEquivalent(yearly: number): number {
  if (!Number.isFinite(yearly) || yearly <= 0) return 0;
  return Math.round((yearly / 12) * 100) / 100;
}

/** What a term of whole years costs. */
export function termTotal(yearly: number, years: number): number {
  if (!Number.isFinite(yearly) || yearly <= 0) return 0;
  return Math.round(yearly * Math.max(0, years) * 100) / 100;
}
