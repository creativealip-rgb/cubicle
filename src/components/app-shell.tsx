"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: "owner" | "member" | "viewer";
  };
}

export function AppShell({ children, user }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          sidebarCollapsed ? "ml-[68px]" : "ml-[260px]",
        )}
      >
        <AppTopbar user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
