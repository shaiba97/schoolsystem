export type PlatformMarket = {
  code: string;
  name: string;
  nameAr: string;
  currency: string;
  timezone: string;
  dialCode: string;
};

export type PlatformProvisionResult = {
  tenant: {
    id: string;
    name: string;
    nameAr: string | null;
    slug: string;
    countryCode: string | null;
    currencyCode: string;
    timezone: string;
    status: string;
  };
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    staffNumber: string | null;
  };
  license: {
    id: string;
    planCode: string | null;
    studentCount: number;
    /** How many years the first term runs for. */
    years: number;
    /** The yearly rate the licence bills. */
    yearlyUsd: number;
    /** The monthly equivalent of the yearly rate. */
    monthlyUsd: number;
    /** What the whole term costs. */
    termTotalUsd: number;
  } | null;
  modules: string[];
  featureFlags: Record<string, boolean>;
};
