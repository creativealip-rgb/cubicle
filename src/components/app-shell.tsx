"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppSidebar, type SidebarBadgeCounts } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { AIChatPanel } from "@/components/ai/chat-panel";
import { LangProvider, type Lang } from "@/lib/i18n-client";

interface AppShellProps {
  children: React.ReactNode;
  lang: Lang;
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: "owner" | "member" | "viewer";
  };
  badgeCounts?: SidebarBadgeCounts;
}

const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function AppShell({ children, lang, user, badgeCounts }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  // Brain page renders the full-page AI panel itself; skip the floating one.
  const onBrainPage = pathname?.startsWith("/app/brain") ?? false;

  // Restore collapsed state from localStorage after hydration
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("cubicle:sidebarCollapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore (e.g. SSR or storage disabled)
    }
    setHydrated(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("cubicle:sidebarCollapsed", collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  return (
    <LangProvider lang={lang}>
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="flex min-h-screen">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          badgeCounts={badgeCounts}
          userEmail={user.email}
        />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-200",
            // Desktop (lg+): shift for sidebar width; tablet/mobile overlay
            "lg:ml-[260px]",
            collapsed && "lg:ml-[68px]",
            "ml-0"
          )}
        >
          <AppTopbar user={user} />
          <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-6 md:pb-28">{children}</main>
        </div>
        {!onBrainPage && <AIChatPanel variant="floating" />}
      </div>
    </SidebarContext.Provider>
    </LangProvider>
  );
}
