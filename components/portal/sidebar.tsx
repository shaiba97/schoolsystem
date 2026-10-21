"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Plus,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

export type NavSection = {
  title: string;
  roles: PlatformRole[];
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    roles: ["SUPER_ADMIN", "SUPPORT"],
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Schools",
    roles: ["SUPER_ADMIN", "SUPPORT"],
    items: [
      { href: "/tenants", label: "School Directory", icon: Building2 },
      { href: "/tenants/new", label: "Provision School", icon: Plus },
    ],
  },
  {
    title: "Platform Operations",
    roles: ["SUPER_ADMIN"],
    items: [
      { href: "/licensing", label: "Licensing & Billing", icon: CreditCard },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/audit", label: "Platform Audit Log", icon: ScrollText },
    ],
  },
  {
    title: "System",
    roles: ["SUPER_ADMIN", "SUPPORT"],
    items: [{ href: "/health", label: "System Health", icon: Activity }],
  },
];

function sectionVisible(section: NavSection, roles: PlatformRole[] | null): boolean {
  if (!roles) return false;
  return section.roles.some((role) => roles.includes(role));
}

function NavLinks({ roles }: { roles: PlatformRole[] | null }) {
  const pathname = usePathname();

  return (
    <>
      {NAV_SECTIONS.filter((section) => sectionVisible(section, roles)).map((section) => (
        <div key={section.title}>
          <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <div className="mt-1 flex flex-col gap-1">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/tenants/new" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function Sidebar() {
  const [roles, setRoles] = React.useState<PlatformRole[] | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("sys_roles");
      setRoles(raw ? (JSON.parse(raw) as PlatformRole[]) : []);
    } catch {
      setRoles([]);
    }
  }, []);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-background p-4 md:flex print:hidden">
      <div className="flex items-center gap-2 px-2">
        <ShieldCheck size={18} className="text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Platform Console
        </p>
      </div>
      <nav aria-label="Platform console" className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
        <NavLinks roles={roles} />
      </nav>
      <LogoutButton />
    </aside>
  );
}

export function MobileNav({ roles, onNavigate }: { roles: PlatformRole[] | null; onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-4" onClick={onNavigate}>
      <NavLinks roles={roles} />
    </div>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // Cookie may already be gone; still land on login.
    } finally {
      try {
        window.sessionStorage.removeItem("sys_roles");
      } catch {
        // Storage unavailable — nothing to clear.
      }
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <LogOut size={18} aria-hidden />
      Sign out
    </button>
  );
}
