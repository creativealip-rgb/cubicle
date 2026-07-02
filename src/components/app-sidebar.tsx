"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
  Receipt,
  Calendar,
  Sparkles,
  Brain as BrainIcon,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
  FileSignature,
  X,
  Wallet,
  BarChart3,
  FileText,
  CreditCard,
  ChevronDown,
  Mail,
  NotebookPen,
} from "lucide-react";
import { useSidebar } from "@/components/app-shell";

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, group: null },
  { label: "Klien", href: "/app/clients", icon: Users, group: "Kerja" },
  { label: "Proyek", href: "/app/projects", icon: Briefcase, group: "Kerja" },
  { label: "Tugas", href: "/app/tasks", icon: CheckSquare, group: "Kerja", badgeKey: "myOpenTasks" as const },
  { label: "Waktu", href: "/app/time", icon: Clock, group: "Kerja" },
  { label: "Kalender", href: "/app/calendar", icon: Calendar, group: "Kerja" },
  { label: "File", href: "/app/files", icon: FolderOpen, group: "Kerja" },
  { label: "Invoice", href: "/app/invoices", icon: Receipt, group: "Keuangan", badgeKey: "unpaidInvoices" as const },
  { label: "Pengeluaran", href: "/app/expenses", icon: Wallet, group: "Keuangan" },
  { label: "Laporan", href: "/app/reports", icon: BarChart3, group: "Keuangan" },
  { label: "Tagihan", href: "/app/billing", icon: CreditCard, group: "Keuangan" },
  { label: "Email", href: "/app/email", icon: Mail, group: "Komunikasi" },
  { label: "Personal", href: "/app/personal", icon: NotebookPen, group: "Personal" },
  { label: "Proposal", href: "/app/proposals", icon: FileText, group: "Penjualan", badgeKey: "draftProposals" as const },
  { label: "Kontrak", href: "/app/contracts", icon: FileSignature, group: "Penjualan", badgeKey: "draftContracts" as const },
  { label: "Formulir", href: "/app/questionnaires", icon: ClipboardList, group: "Penjualan" },
  { label: "Template", href: "/app/contract-templates", icon: FileText, group: "Penjualan" },
  { label: "Brain", href: "/app/brain", icon: BrainIcon, group: "AI" },
  { label: "Prompt", href: "/app/prompts", icon: Sparkles, group: "AI" },
];

const groupLabels = {
  Kerja: { id: "Kerja", en: "Work" },
  Keuangan: { id: "Keuangan", en: "Finance" },
  Komunikasi: { id: "Komunikasi", en: "Comms" },
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
  Invoice: { id: "Invoice", en: "Invoices" },
  Pengeluaran: { id: "Pengeluaran", en: "Expenses" },
  Laporan: { id: "Laporan", en: "Reports" },
  Tagihan: { id: "Tagihan", en: "Billing" },
  Email: { id: "Email", en: "Email" },
  Personal: { id: "Personal", en: "Personal" },
  Proposal: { id: "Proposal", en: "Proposals" },
  Kontrak: { id: "Kontrak", en: "Contracts" },
  Formulir: { id: "Formulir", en: "Forms" },
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
}

export function AppSidebar({ collapsed, onToggle, badgeCounts }: AppSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const [lang, setLang] = useState<"id" | "en">("id");
  const openGroups: Record<string, boolean> = {
    Kerja: true,
    Keuangan: false,
    Komunikasi: false,
    Personal: false,
    Penjualan: false,
    AI: false,
  };
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  useEffect(() => {
    function syncLang() {
      const cookieLang = document.cookie
        .split("; ")
        .find((row) => row.startsWith("cubiqlo_lang="))
        ?.split("=")[1];
      setLang(cookieLang === "en" ? "en" : "id");
    }

    syncLang();

    window.addEventListener("focus", syncLang);
    return () => window.removeEventListener("focus", syncLang);
  }, [pathname]);


  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Group nav items by section for visual grouping
  const groupedItems: Array<{ name: string | null; items: typeof navItems }> = [];
  for (const item of navItems) {
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
        // Desktop: always visible, normal collapse behavior
        "md:translate-x-0",
        collapsed ? "md:w-[68px]" : "md:w-[260px]",
        // Mobile: off-canvas by default, slide in when open
        "w-[260px] -translate-x-full",
        mobileOpen && "translate-x-0"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "md:justify-center" : "md:justify-between justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/app/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <Image src="/icon-192.png" alt="Cubiqlo" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
            <span className="text-sm">Cubiqlo</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/app/dashboard" className="hidden md:flex">
            <Image src="/icon-192.png" alt="Cubiqlo" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
          </Link>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent absolute -right-3 top-3 rounded-full border bg-background shadow-sm"
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
                  <div
                    className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70"
                  >
                    <span>{g.name ? t(groupLabels[g.name as keyof typeof groupLabels].id, groupLabels[g.name as keyof typeof groupLabels].en) : ""}</span>
                    <ChevronDown className={cn("h-3 w-3", !isGroupOpen && "-rotate-90")} />
                  </div>
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
                              {!collapsed && <span className="flex-1">{t(navLabels[item.label]?.id ?? item.label, navLabels[item.label]?.en ?? item.label)}</span>}
                              {!collapsed && badge > 0 && (
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
                              {collapsed && badge > 0 && (
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
                              {badge > 0 ? ` (${badge})` : ""}
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
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="text-xs text-muted-foreground">
            Cubiqlo v0.1.21
          </p>
        )}
      </div>
    </aside>
  );
}
