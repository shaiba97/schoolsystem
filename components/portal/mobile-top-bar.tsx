"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { MobileNav, type PlatformRole } from "@/components/portal/sidebar";

export function MobileTopBar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [roles, setRoles] = React.useState<PlatformRole[] | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("sys_roles");
      setRoles(raw ? (JSON.parse(raw) as PlatformRole[]) : []);
    } catch {
      setRoles([]);
    }
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur print:hidden md:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
        <ShieldCheck size={20} className="shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Platform Console
        </p>
      </div>
      {open && (
        <nav
          aria-label="Platform console"
          className="max-h-[70vh] overflow-y-auto border-t bg-background px-4 py-3"
        >
          <MobileNav roles={roles} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </div>
  );
}
