import type { ReactNode } from "react";
import { Sidebar } from "@/components/portal/sidebar";
import { MobileTopBar } from "@/components/portal/mobile-top-bar";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-20 md:px-6 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
