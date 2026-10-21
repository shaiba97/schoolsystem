import Link from "next/link";
import { notFound } from "next/navigation";
import { systemApiFetch, ApiError } from "@/lib/api/client";
import type { PlatformTenantDetail } from "@/lib/api/platform-types";
import { TenantDetailClient } from "@/components/tenants/tenant-detail-client";

export const dynamic = "force-dynamic";

const TABS = ["overview", "modules", "billing", "data"] as const;
type TabKey = (typeof TABS)[number];

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { schoolId } = await params;
  const { tab } = await searchParams;
  const activeTab: TabKey = (TABS as readonly string[]).includes(tab ?? "")
    ? (tab as TabKey)
    : "overview";

  let tenant: PlatformTenantDetail;
  try {
    tenant = await systemApiFetch<PlatformTenantDetail>(`/platform/tenants/${schoolId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight">School unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof ApiError
            ? error.message
            : "The platform API could not be reached."}
        </p>
        <Link href="/tenants" className="text-sm font-medium hover:underline">
          Back to the directory
        </Link>
      </div>
    );
  }

  return <TenantDetailClient initialTenant={tenant} initialTab={activeTab} />;
}
