"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FolderOpen,
  Clock,

  Calendar,
  Sparkles,
  Brain as BrainIcon,
  PanelLeftClose,
  PanelLeft,
  FileSignature,
  X,
  Wallet,
  BarChart3,
  FileText,
  Layers,
  Package,

  ChevronDown,
  NotebookPen,
} from "lucide-react";
import { useSidebar } from "@/components/app-shell";
import { canAccessTemplatesPreview } from "@/lib/feature-access";

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, group: null },
  { label: "Klien", href: "/app/clients", icon: Users, group: "Kerja" },
  { label: "Proyek", href: "/app/projects", icon: Briefcase, group: "Kerja" },
  { label: "Tugas", href: "/app/tasks", icon: CheckSquare, group: "Kerja", badgeKey: "myOpenTasks" as const },
  { label: "Waktu", href: "/app/time", icon: Clock, group: "Kerja" },
  { label: "Kalender", href: "/app/calendar", icon: Calendar, group: "Kerja" },
  { label: "File", href: "/app/files", icon: FolderOpen, group: "Kerja" },
  { label: "Invoice", href: "/app/invoices", icon: FileText, group: "Keuangan", badgeKey: "unpaidInvoices" as const },
  { label: "Paket", href: "/app/packages", icon: Package, group: "Keuangan" },
  { label: "Pengeluaran", href: "/app/expenses", icon: Wallet, group: "Keuangan" },
  { label: "Laporan", href: "/app/reports", icon: BarChart3, group: "Keuangan" },
  { label: "Catatan", href: "/app/personal", icon: NotebookPen, group: "Personal" },
  { label: "Landing Page", href: "/app/personal-site", icon: FileText, group: "Personal" },
  { label: "Jurnal", href: "/app/journal", icon: NotebookPen, group: "Personal" },
  { label: "Proposal", href: "/app/proposals", icon: FileText, group: "Penjualan", badgeKey: "draftProposals" as const },
  { label: "Kontrak", href: "/app/contracts", icon: FileSignature, group: "Penjualan", badgeKey: "draftContracts" as const },

  { label: "Template", href: "/app/templates", icon: Layers, group: "Penjualan" },
  { label: "Brain", href: "/app/brain", icon: BrainIcon, group: "AI" },
  { label: "Prompt", href: "/app/prompts", icon: Sparkles, group: "AI" },
];

const groupLabels = {
  Kerja: { id: "Kerja", en: "Work" },
  Keuangan: { id: "Keuangan", en: "Finance" },
  Personal: { id: "Personal", en: "Personal" },
  Penjualan: { id: "Penjualan", en: "Sales" },
  AI: { id: "AI", en: "AI" },
} as const;

const navLabels: Record<string, { id: string; en: string }> = {
  Dashboard: { id: "Dashboard", en: "Dashboard" },
  Klien: { id: "Klien", en: "Clients" },
  Proyek: { id: "Proyek", en: "Projects" },
  Tugas: { id: "Tugas", en: "Tasks" },
  Waktu: { id: "Waktu", en: "Time" },
  Kalender: { id: "Kalender", en: "Calendar" },
  File: { id: "File", en: "Files" },
  Invoice: { id: "Invoice", en: "Invoice" },
  Paket: { id: "Paket", en: "Packages" },
  Pengeluaran: { id: "Pengeluaran", en: "Expenses" },
  Laporan: { id: "Laporan", en: "Reports" },
  Catatan: { id: "Catatan", en: "Notes" },
  Notes: { id: "Catatan", en: "Notes" },
  "Landing Page": { id: "Landing Page", en: "Landing Page" },
  Jurnal: { id: "Jurnal", en: "Journal" },
  Journal: { id: "Jurnal", en: "Journal" },
  Proposal: { id: "Proposal", en: "Proposals" },
  Kontrak: { id: "Kontrak", en: "Contracts" },
  Template: { id: "Template", en: "Templates" },
  Brain: { id: "Brain", en: "Brain" },
  Prompt: { id: "Prompt", en: "Prompts" },
};

const badgeLabels: Record<SidebarBadgeKey, { id: string; en: string }> = {
  myOpenTasks: { id: "tugas terbuka", en: "open tasks" },
  unpaidInvoices: { id: "invoice belum dibayar", en: "unpaid invoices" },
  draftProposals: { id: "proposal belum dikirim", en: "unsent proposals" },
  draftContracts: { id: "kontrak belum dikirim", en: "unsent contracts" },
};

export type SidebarBadgeKey =
  | "myOpenTasks"
  | "unpaidInvoices"
  | "draftProposals"
  | "draftContracts";

export interface SidebarBadgeCounts {
  myOpenTasks?: number;
  unpaidInvoices?: number;
  draftProposals?: number;
  draftContracts?: number;
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  badgeCounts?: SidebarBadgeCounts;
  userEmail?: string;
  /** PERSONAL (notes/landing/journal) = owner workspace only */
  workspaceRole?: "owner" | "member" | "viewer";
}

export function AppSidebar({
  collapsed,
  onToggle,
  badgeCounts,
  userEmail,
  workspaceRole,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { lang, t, setLang, pending } = useT();
  const templatesPreview = canAccessTemplatesPreview(userEmail);
  const canSeePersonal = workspaceRole === "owner";

  function changeLang(next: "id" | "en") {
    setLang(next);
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Kerja: true,
    Keuangan: false,
    Personal: false,
    Penjualan: false,
    AI: false,
  });

  function activeGroupForPath(path: string): string | null {
    // Routes that live under Sales but aren't direct nav hrefs
    if (
      path.startsWith("/app/contract-templates") ||
      path.startsWith("/app/invoice-templates") ||
      path.startsWith("/app/invoices/templates")
    ) {
      return "Penjualan";
    }

    let match: { group: string | null; href: string } | null = null;
    for (const item of navItems) {
      if (!item.group) continue;
      const hit =
        path === item.href ||
        (item.href !== "/app/dashboard" && path.startsWith(item.href + "/"));
      if (!hit) continue;
      // Prefer longest href match (e.g. nested routes)
      if (!match || item.href.length > match.href.length) {
        match = { group: item.group, href: item.href };
      }
    }
    return match?.group ?? null;
  }

  function toggleGroup(name: string) {
    setOpenGroups((prev) => {
      if (name === "Kerja") {
        return {
          Kerja: true,
          Keuangan: prev.Keuangan ?? false,
          Personal: prev.Personal ?? false,
          Penjualan: prev.Penjualan ?? false,
          AI: prev.AI ?? false,
        };
      }
      // Accordion: open clicked group, close other non-Kerja groups
      const nextOpen = prev[name] === false;
      return {
        Kerja: true,
        Keuangan: false,
        Personal: false,
        Penjualan: false,
        AI: false,
        [name]: nextOpen,
      };
    });
  }

  // Auto-open group that owns current route (so active item not hidden)
  useEffect(() => {
    const activeGroup = activeGroupForPath(pathname);
    setOpenGroups((prev): Record<string, boolean> => {
      if (!activeGroup || activeGroup === "Kerja") {
        return {
          Kerja: true,
          Keuangan: Boolean(prev.Keuangan),
          Personal: Boolean(prev.Personal),
          Penjualan: Boolean(prev.Penjualan),
          AI: Boolean(prev.AI),
        };
      }
      // Keep Kerja open; expand active section; collapse other optional sections
      return {
        Kerja: true,
        Keuangan: activeGroup === "Keuangan",
        Personal: activeGroup === "Personal",
        Penjualan: activeGroup === "Penjualan",
        AI: activeGroup === "AI",
      };
    });
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Group nav items by section for visual grouping
  // PERSONAL = owner-only (workspace personal tools, not shared team data)
  const visibleNavItems = navItems.filter(
    (item) => item.group !== "Personal" || canSeePersonal,
  );
  const groupedItems: Array<{ name: string | null; items: typeof navItems }> = [];
  for (const item of visibleNavItems) {
    const last = groupedItems[groupedItems.length - 1];
    if (!last || last.name !== item.group) {
      groupedItems.push({ name: item.group, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-sidebar-background transition-all duration-200",
        // Desktop lg+: always visible, normal collapse behavior
        "lg:translate-x-0",
        collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
        // Mobile + tablet: off-canvas by default, slide in when open
        "w-[min(280px,85vw)] -translate-x-full",
        mobileOpen && "translate-x-0"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "lg:justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/app/dashboard" className="flex min-w-0 items-center gap-2 font-semibold text-sidebar-foreground">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-8 w-auto object-contain sm:h-9" />
          </Link>
        )}
        {collapsed && (
          <Link href="/app/dashboard" className="hidden lg:flex">
            <Image src="/logo-icon.png" alt="Cubiqlo" width={36} height={36} className="h-9 w-9 rounded-md object-cover" />
          </Link>
        )}
        {/* Mobile/tablet close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:flex"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-3 hidden h-8 w-8 rounded-full border bg-background text-sidebar-foreground shadow-sm hover:bg-sidebar-accent lg:flex"
            onClick={onToggle}
          >
            <PanelLeft className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <TooltipProvider delayDuration={300}>
          <div className="space-y-3">
            {groupedItems.map((g) => {
              const isGroupOpen = !g.name || collapsed || openGroups[g.name] !== false;
              return (
              <div key={g.name ?? "_main"}>
                {!collapsed && g.name && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name!)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 hover:bg-sidebar-accent",
                      g.name === "Kerja" && "cursor-default hover:bg-transparent",
                    )}
                  >
                    <span>{g.name ? t(groupLabels[g.name as keyof typeof groupLabels].id, groupLabels[g.name as keyof typeof groupLabels].en) : ""}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", !isGroupOpen && "-rotate-90")} />
                  </button>
                )}
                {isGroupOpen && (
                <ul className="space-y-1">
                  {g.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/app/dashboard" &&
                        pathname.startsWith(item.href + "/"));
                    const Icon = item.icon;
                    const badge =
                      item.badgeKey
                        ? (badgeCounts?.[item.badgeKey] ?? 0)
                        : 0;
                    const badgeLabel = item.badgeKey
                      ? t(badgeLabels[item.badgeKey].id, badgeLabels[item.badgeKey].en)
                      : "";
                    const isTemplatesItem = item.href === "/app/templates";

                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                collapsed && "justify-center px-2",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <span className="flex-1">
                                  {t(navLabels[item.label]?.id ?? item.label, navLabels[item.label]?.en ?? item.label)}
                                </span>
                              )}
                              {!collapsed && isTemplatesItem && (
                                <span
                                  className={cn(
                                    "ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    isActive
                                      ? "bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground"
                                      : "bg-amber-100 text-amber-800",
                                  )}
                                  title={
                                    templatesPreview
                                      ? t("Preview internal (Soon)", "Internal preview (Soon)")
                                      : t("Segera hadir", "Coming soon")
                                  }
                                >
                                  Soon
                                </span>
                              )}
                              {!collapsed && !isTemplatesItem && badge > 0 && (
                                <span
                                  className={cn(
                                    "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                                    isActive
                                      ? "bg-sidebar-primary-foreground text-sidebar-primary"
                                      : "bg-blue-600 text-white",
                                  )}
                                  aria-label={`${badge} ${badgeLabel}`}
                                >
                                  {badge > 99 ? "99+" : badge}
                                </span>
                              )}
                              {collapsed && isTemplatesItem && (
                                <span
                                  className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-amber-500"
                                  aria-label="Soon"
                                />
                              )}
                              {collapsed && !isTemplatesItem && badge > 0 && (
                                <span
                                  className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-blue-500"
                                  aria-label={`${badge} ${badgeLabel}`}
                                />
                              )}
                            </Link>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right">
                              {t(navLabels[item.label]?.id ?? item.label, navLabels[item.label]?.en ?? item.label)}
                              {isTemplatesItem
                                ? " · Soon"
                                : badge > 0
                                  ? ` (${badge})`
                                  : ""}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
              );
            })}
          </div>
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-sidebar-border p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={() => changeLang(lang === "id" ? "en" : "id")}
            disabled={pending}
            aria-label={t("Ganti ke Bahasa Inggris", "Switch to Indonesian")}
            className="mx-auto flex h-7 w-full items-center justify-center rounded-md border bg-white text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {lang === "id" ? "ID" : "EN"}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Cubiqlo v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}
            </p>
            <div className={cn("flex items-center rounded-md border bg-white p-0.5 text-[11px] transition-opacity", pending && "opacity-50")}>
              <button
                type="button"
                onClick={() => changeLang("id")}
                disabled={pending}
                aria-label={t("Bahasa Indonesia", "Indonesian")}
                className={cn(
                  "h-5 rounded px-2 font-semibold transition-colors",
                  lang === "id"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => changeLang("en")}
                disabled={pending}
                aria-label={t("Bahasa Inggris", "English")}
                className={cn(
                  "h-5 rounded px-2 font-semibold transition-colors",
                  lang === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                EN
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
