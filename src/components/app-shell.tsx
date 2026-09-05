"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppSidebar, type SidebarBadgeCounts } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { AIChatPanel } from "@/components/ai/chat-panel";
import { LangProvider, type Lang } from "@/lib/i18n-client";
import { TransitionProvider, useAppTransition } from "@/lib/transition-provider";
import { isStaleServerActionError } from "@/lib/client-errors";
import { toast } from "sonner";

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

/** Thin indeterminate bar shown while a transition refresh is in flight. */
function TopProgressBar() {
  const { isPending } = useAppTransition();
  if (!isPending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
      <div className="top-progress-bar h-full w-1/3 rounded-full bg-[#6647F0]" />
    </div>
  );
}

export function AppShell({ children, lang, user, badgeCounts }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const focusEditor = pathname === "/app/personal-site";
  const documentEditor = Boolean(pathname?.endsWith("/edit") && (pathname.startsWith("/app/proposals/") || pathname.startsWith("/app/contracts/")));
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

    // Global Auto-Reload Interceptor for Stale Server Action Errors
    function handleGlobalError(event: ErrorEvent | PromiseRejectionEvent) {
      const err = "reason" in event ? event.reason : event.error;
      if (isStaleServerActionError(err)) {
        toast.info("Versi aplikasi baru terdeteksi. Memuat ulang halaman...");
        setTimeout(() => window.location.reload(), 600);
      }
    }

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
    };
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
    <TransitionProvider>
    <LangProvider lang={lang}>
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <TopProgressBar />
      {/* Skip-to-content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Lompati ke konten utama
      </a>
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
          collapsed={focusEditor || collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          badgeCounts={badgeCounts}
          userEmail={user.email}
          workspaceRole={user.role}
        />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-200",
            // Desktop (lg+): shift for sidebar width; tablet/mobile overlay
            "lg:ml-[260px]",
            collapsed && "lg:ml-[68px]",
            focusEditor && "lg:ml-[68px]",
            "ml-0"
          )}
        >
          <AppTopbar user={user} />
          <main id="main-content" className={cn("min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-6 md:pb-28", (focusEditor || documentEditor || onBrainPage) && "p-0 pb-0 sm:p-0 md:p-0 md:pb-0")}>{children}</main>
        </div>
        {!onBrainPage && <AIChatPanel variant="floating" />}
      </div>
    </SidebarContext.Provider>
    </LangProvider>
    </TransitionProvider>
  );
}
