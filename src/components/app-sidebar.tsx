"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Megaphone, PanelLeft, PanelLeftClose, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarNavigation } from "@/components/sidebar/sidebar-navigation";
import { useSidebar } from "@/components/app-shell";
import { useT } from "@/lib/i18n-client";
import { latestProductUpdateId, WHATS_NEW_STORAGE_KEY } from "@/lib/product-updates";
import type { SidebarBadgeCounts, WorkspaceRole } from "@/lib/navigation/app-navigation";
import { cn } from "@/lib/utils";

export type SidebarBadgeKey = "myOpenTasks" | "unpaidInvoices" | "draftProposals" | "draftContracts";
export interface AppSidebarBadgeCounts extends SidebarBadgeCounts { draftProposals?: number; draftContracts?: number }

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  badgeCounts?: AppSidebarBadgeCounts;
  userEmail?: string;
  workspaceRole?: WorkspaceRole;
}

export function AppSidebar({ collapsed, onToggle, badgeCounts, workspaceRole }: AppSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { lang, t, setLang, pending } = useT();
  const [hasUnreadUpdate, setHasUnreadUpdate] = useState(false);

  useEffect(() => {
    function syncWhatsNew() {
      try { setHasUnreadUpdate(window.localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== latestProductUpdateId); }
      catch { setHasUnreadUpdate(false); }
    }
    syncWhatsNew();
    window.addEventListener("cubiqlo:whats-new-seen", syncWhatsNew);
    window.addEventListener("storage", syncWhatsNew);
    return () => {
      window.removeEventListener("cubiqlo:whats-new-seen", syncWhatsNew);
      window.removeEventListener("storage", syncWhatsNew);
    };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  return <aside className={cn(
    "fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] -translate-x-full flex-col border-r border-slate-200/80 bg-sidebar-background transition-all duration-200 lg:translate-x-0",
    collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
    mobileOpen && "translate-x-0",
  )}>
    <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed ? "lg:justify-center" : "justify-between")}>
      {!collapsed && <Link href="/app/dashboard" className="flex min-w-0 items-center gap-2 font-semibold text-sidebar-foreground"><Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-8 w-auto object-contain sm:h-9" /></Link>}
      {collapsed && <Link href="/app/dashboard" className="hidden lg:flex"><Image src="/logo-icon.png" alt="Cubiqlo" width={36} height={36} className="h-9 w-9 rounded-md object-cover" /></Link>}
      <Button variant="ghost" size="icon" className="h-11 w-11 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t("Tutup menu", "Close menu")}><X className="h-4 w-4" /></Button>
      {!collapsed && <Button variant="ghost" size="icon" className="hidden h-11 w-11 text-sidebar-foreground hover:bg-sidebar-accent lg:flex" onClick={onToggle} aria-label={t("Ciutkan sidebar", "Collapse sidebar")}><PanelLeftClose className="h-4 w-4" /></Button>}
      {collapsed && <Button variant="ghost" size="icon" className="absolute -right-3 top-1.5 hidden h-11 w-11 rounded-full border bg-background text-sidebar-foreground shadow-sm hover:bg-sidebar-accent lg:flex" onClick={onToggle} aria-label={t("Bentangkan sidebar", "Expand sidebar")}><PanelLeft className="h-4 w-4" /></Button>}
    </div>

    <nav className="flex-1 overflow-y-auto px-2 py-3">
      <SidebarNavigation collapsed={collapsed} badgeCounts={badgeCounts} workspaceRole={workspaceRole} onNavigate={() => setMobileOpen(false)} />
    </nav>

    <div className="space-y-2 border-t border-sidebar-border p-3">
      <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Link href="/app/whats-new" className={cn("relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", pathname === "/app/whats-new" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center px-2")}><Megaphone className="h-4 w-4 shrink-0" />{!collapsed && <span className="flex-1">What’s New</span>}{hasUnreadUpdate && !collapsed && <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>}{hasUnreadUpdate && collapsed && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-600" aria-label="New product update" />}</Link></TooltipTrigger>{collapsed && <TooltipContent side="right">What’s New{hasUnreadUpdate ? " · New" : ""}</TooltipContent>}</Tooltip></TooltipProvider>
      {collapsed ? <button type="button" onClick={() => setLang(lang === "id" ? "en" : "id")} disabled={pending} aria-label={t("Ganti ke Bahasa Inggris", "Switch to Indonesian")} className="mx-auto flex min-h-11 min-w-11 w-full items-center justify-center rounded-md border bg-white text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50">{lang === "id" ? "ID" : "EN"}</button> : <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Cubiqlo v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}</p><div className={cn("flex items-center rounded-md border bg-white p-0.5 text-[11px]", pending && "opacity-50")}>{(["id", "en"] as const).map((code) => <button key={code} type="button" onClick={() => setLang(code)} disabled={pending} aria-label={code === "id" ? "Bahasa Indonesia" : "English"} className={cn("min-h-11 min-w-11 rounded px-2 font-semibold uppercase", lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{code}</button>)}</div></div>}
    </div>
  </aside>;
}

export type { SidebarBadgeCounts } from "@/lib/navigation/app-navigation";