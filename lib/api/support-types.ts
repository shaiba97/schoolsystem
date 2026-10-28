export type InquiryRegion =
  | "SUDAN"
  | "EGYPT"
  | "GCC_KSA"
  | "GCC_UAE"
  | "GCC_KUWAIT"
  | "GCC_QATAR"
  | "GCC_OMAN"
  | "GCC_BAHRAIN";

export type InquiryStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";

export type ContactType = "EMAIL" | "PHONE";

export type LandingInquiry = {
  id: string;
  fullName: string;
  schoolName: string;
  email: string;
  phone: string;
  region: InquiryRegion;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  ipAddress: string | null;
  createdAt: string;
};

export type InquiryPageData = {
  items: LandingInquiry[];
  nextCursor: string | null;
};

export type SupportContactRow = {
  id: string;
  contact: string;
  contactType: ContactType;
  region: InquiryRegion;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupportContactPageData = {
  items: SupportContactRow[];
};

export const REGION_LABELS: Record<InquiryRegion, string> = {
  SUDAN: "Sudan",
  EGYPT: "Egypt",
  GCC_KSA: "KSA (Saudi Arabia)",
  GCC_UAE: "UAE (United Arab Emirates)",
  GCC_KUWAIT: "Kuwait",
  GCC_QATAR: "Qatar",
  GCC_OMAN: "Oman",
  GCC_BAHRAIN: "Bahrain",
};

export const REGIONS = Object.entries(REGION_LABELS) as Array<[InquiryRegion, string]>;

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

export const STATUSES = Object.entries(STATUS_LABELS) as Array<[InquiryStatus, string]>;

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
};

/** Badge palette per inquiry status; unknown statuses fall back to neutral. */
export const STATUS_BADGE: Record<InquiryStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
};

export function inquiryListPath(filters: {
  status?: string;
  region?: string;
  search?: string;
  cursor?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.region) params.set("region", filters.region);
  if (filters.search) params.set("search", filters.search);
  if (filters.cursor) params.set("cursor", filters.cursor);
  const query = params.toString();
  return query ? `/inquiries?${query}` : "/inquiries";
}

export function supportContactsPath(filters: {
  region?: string;
  contactType?: string;
  isActive?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.contactType) params.set("contactType", filters.contactType);
  if (filters.isActive) params.set("isActive", filters.isActive);
  const query = params.toString();
  return query ? `/support-contacts?${query}` : "/support-contacts";
}
