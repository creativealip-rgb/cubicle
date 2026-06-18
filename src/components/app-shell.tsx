"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AppSidebar, type SidebarBadgeCounts } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { AIChatPanel } from "@/components/ai/chat-panel";

interface AppShellProps {
  children: React.ReactNode;
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

export function AppShell({ children, user, badgeCounts }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="flex min-h-screen">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          badgeCounts={badgeCounts}
        />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-200",
            // Desktop: shift for sidebar width
            "md:ml-[260px]",
            collapsed && "md:ml-[68px]",
            // Mobile: no margin (sidebar overlays)
            "ml-0"
          )}
        >
          <AppTopbar user={user} />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
        <AIChatPanel />
      </div>
    </SidebarContext.Provider>
  );
}
