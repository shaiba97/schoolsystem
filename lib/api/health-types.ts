export type PlatformHealthReport = {
  status: "ok" | "degraded";
  checkedAt: string;
  uptimeSeconds: number;
  database: {
    reachable: boolean;
    latencyMs: number;
    error: string | null;
  };
  counts: {
    tenants: number;
    activeTenants: number;
    suspendedTenants: number;
    archivedTenants: number;
    users: number;
    students: number;
    teachers: number;
    licences: number;
    activeLicences: number;
    plans: number;
  };
  realtime: { connections: number };
  storage: { root: string; bytes: number; files: number; truncated: boolean };
  process: {
    node: string;
    platform: string;
    memory: { rssMb: number; heapUsedMb: number };
  };
};
