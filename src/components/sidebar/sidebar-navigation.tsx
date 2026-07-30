"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import {
  formatSidebarBadge,
  getActiveNavigation,
  getVisibleNavigation,
  groupHasNotification,
  type SidebarBadgeCounts,
  type SidebarGroupId,
  type WorkspaceRole,
} from "@/lib/navigation/app-navigation";

interface SidebarNavigationProps {
  collapsed: boolean;
  badgeCounts?: SidebarBadgeCounts;
  workspaceRole?: WorkspaceRole;
  onNavigate: () => void;
}

export function SidebarNavigation({ collapsed, badgeCounts = {}, workspaceRole, onNavigate }: SidebarNavigationProps) {
  const pathname = usePathname();
  const { t } = useT();
  const entries = getVisibleNavigation(workspaceRole);
  const active = getActiveNavigation(pathname);
  const [mobileGroup, setMobileGroup] = useState<SidebarGroupId | null>(active.groupId);

  useEffect(() => {
    setMobileGroup(active.groupId);
  }, [pathname, active.groupId]);

  function badgeFor(key?: "myOpenTasks" | "unpaidInvoices") {
    return key ? (badgeCounts[key] ?? 0) : 0;
  }

  function directLink(item: Extract<(typeof entries)[number], { kind: "direct" }>, compact = false) {
    const Icon = item.icon;
    const isActive = active.itemId === item.id;
    const badge = badgeFor(item.badgeKey);
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        title={compact ? t(item.label.id, item.label.en) : undefined}
        className={cn(
          "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
          compact && "justify-center px-2",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!compact && <span className="flex-1">{t(item.label.id, item.label.en)}</span>}
        {!compact && badge > 0 && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold", isActive ? "bg-white text-violet-700" : "bg-blue-600 text-white")}>
            {formatSidebarBadge(badge)}
          </span>
        )}
        {compact && badge > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />}
      </Link>
    );
  }

  return (
    <div>
      <div className="hidden space-y-1 lg:block">
        {entries.map((entry) => {
          if (entry.kind === "direct") return directLink(entry, collapsed);
          const Icon = entry.icon;
          const groupActive = active.groupId === entry.id;
          return (
            <div key={entry.id} className="space-y-1">
              <div
                aria-current={groupActive ? "true" : undefined}
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium",
                  groupActive ? "bg-violet-50 text-violet-700" : "text-sidebar-foreground",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? t(entry.label.id, entry.label.en) : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1">{t(entry.label.id, entry.label.en)}</span>}
                {groupHasNotification(entry.id, badgeCounts) && !groupActive && <span className="h-2 w-2 rounded-full bg-blue-600" />}
              </div>
              {groupActive && !collapsed && (
                <div className="ml-4 space-y-1 border-l border-slate-200 pl-2">
                  {entry.children.map((item) => directLink(item))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1 lg:hidden">
        {entries.map((entry) => entry.kind === "direct" ? directLink(entry) : (
          <div key={entry.id}>
            <button
              type="button"
              aria-expanded={mobileGroup === entry.id}
              aria-controls={`sidebar-mobile-${entry.id}`}
              onClick={() => setMobileGroup((current) => current === entry.id ? null : entry.id)}
              className={cn(
                "relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium",
                active.groupId === entry.id ? "bg-violet-50 text-violet-700" : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <entry.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{t(entry.label.id, entry.label.en)}</span>
              {groupHasNotification(entry.id, badgeCounts) && mobileGroup !== entry.id && <span className="h-2 w-2 rounded-full bg-blue-600" />}
              <ChevronDown className={cn("h-4 w-4 transition-transform", mobileGroup !== entry.id && "-rotate-90")} />
            </button>
            {mobileGroup === entry.id && (
              <div id={`sidebar-mobile-${entry.id}`} className="ml-4 space-y-1 border-l border-slate-200 pl-2">
                {entry.children.map((item) => directLink(item))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
