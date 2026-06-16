"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
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
  myOpenTasksCount?: number;
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

export function AppShell({ children, user, myOpenTasksCount = 0 }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          myOpenTasksCount={myOpenTasksCount}
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
