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
    monthlyUsd: number;
  } | null;
  modules: string[];
  featureFlags: Record<string, boolean>;
};
