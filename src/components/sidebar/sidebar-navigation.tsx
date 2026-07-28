"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import {
  formatSidebarBadge, getActiveNavigation, getVisibleNavigation, groupHasNotification,
  type NavGroup, type SidebarBadgeCounts, type SidebarGroupId, type WorkspaceRole,
} from "@/lib/navigation/app-navigation";

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 300;

interface SidebarNavigationProps {
  collapsed: boolean;
  badgeCounts?: SidebarBadgeCounts;
  workspaceRole?: WorkspaceRole;
  onNavigate: () => void;
}

type PanelPosition = { top: number; left: number };

export function SidebarNavigation({ collapsed, badgeCounts = {}, workspaceRole, onNavigate }: SidebarNavigationProps) {
  const pathname = usePathname();
  const { t } = useT();
  const entries = getVisibleNavigation(workspaceRole);
  const active = getActiveNavigation(pathname);
  const [hovered, setHovered] = useState<SidebarGroupId | null>(null);
  const [pinned, setPinned] = useState<SidebarGroupId | null>(null);
  const [mobileGroup, setMobileGroup] = useState<SidebarGroupId | null>(active.groupId);
  const [position, setPosition] = useState<PanelPosition>({ top: 64, left: collapsed ? 76 : 268 });
  const triggers = useRef<Partial<Record<SidebarGroupId, HTMLButtonElement | null>>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openGroup = pinned ?? hovered;
  const openEntry = entries.find((entry): entry is NavGroup => entry.kind === "group" && entry.id === openGroup);

  function clearTimers() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function placePanel(id: SidebarGroupId) {
    const rect = triggers.current[id]?.getBoundingClientRect();
    if (!rect) return;
    const panelHeight = id === "sales" ? 430 : id === "finance" ? 300 : 240;
    setPosition({ top: Math.max(12, Math.min(rect.top - 8, window.innerHeight - panelHeight - 12)), left: rect.right + 8 });
  }
  function scheduleOpen(id: SidebarGroupId) {
    if (pinned) return;
    clearTimers();
    openTimer.current = setTimeout(() => { placePanel(id); setHovered(id); }, OPEN_DELAY_MS);
  }
  function scheduleClose() {
    if (pinned) return;
    clearTimers();
    closeTimer.current = setTimeout(() => setHovered(null), CLOSE_DELAY_MS);
  }
  function togglePinned(id: SidebarGroupId) {
    clearTimers();
    placePanel(id);
    setHovered(null);
    setPinned((current) => current === id ? null : id);
  }
  function closeDesktop(restoreFocus = false) {
    const previous = openGroup;
    clearTimers(); setHovered(null); setPinned(null);
    if (restoreFocus && previous) triggers.current[previous]?.focus();
  }

  useEffect(() => {
    setPinned(null); setHovered(null); setMobileGroup(active.groupId);
  }, [pathname, active.groupId]);
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) closeDesktop(); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  function badgeFor(key?: "myOpenTasks" | "unpaidInvoices") { return key ? (badgeCounts[key] ?? 0) : 0; }
  function directLink(item: Extract<(typeof entries)[number], { kind: "direct" }>, compact = false) {
    const Icon = item.icon; const isActive = active.itemId === item.id; const badge = badgeFor(item.badgeKey);
    return <Link key={item.id} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined}
      title={compact ? t(item.label.id, item.label.en) : undefined}
      className={cn("relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent", compact && "justify-center px-2")}>
      <Icon className="h-4 w-4 shrink-0" />{!compact && <span className="flex-1">{t(item.label.id, item.label.en)}</span>}
      {!compact && badge > 0 && <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold", isActive ? "bg-white text-violet-700" : "bg-blue-600 text-white")}>{formatSidebarBadge(badge)}</span>}
      {compact && badge > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />}
    </Link>;
  }

  return <div ref={rootRef}>
    <div className="hidden space-y-1 lg:block">
      {entries.map((entry) => {
        if (entry.kind === "direct") return directLink(entry, collapsed);
        const Icon = entry.icon; const isActive = active.groupId === entry.id; const expanded = openGroup === entry.id;
        const hasDot = groupHasNotification(entry.id, badgeCounts);
        return <div key={entry.id} onPointerEnter={() => scheduleOpen(entry.id)} onPointerLeave={scheduleClose}>
          <button ref={(node) => { triggers.current[entry.id] = node; }} type="button" aria-expanded={expanded} aria-controls={`sidebar-flyout-${entry.id}`}
            onClick={() => togglePinned(entry.id)} onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); placePanel(entry.id); setPinned(entry.id); requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#sidebar-flyout-${entry.id} a`)?.focus()); }
              if (event.key === "Escape") closeDesktop(true);
            }}
            className={cn("relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", isActive || expanded ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center px-2")}>
            <Icon className="h-4 w-4 shrink-0" />{!collapsed && <><span className="flex-1 text-left">{t(entry.label.id, entry.label.en)}</span><ChevronRight className="h-4 w-4" /></>}
            {hasDot && !expanded && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" aria-label={t("Memiliki notifikasi terbuka", "Has open notifications")} />}
          </button>
        </div>;
      })}
      {openEntry && <div id={`sidebar-flyout-${openEntry.id}`} role="navigation" aria-label={t(openEntry.label.id, openEntry.label.en)}
        style={{ top: position.top, left: position.left }} onPointerEnter={() => { clearTimers(); setHovered(openEntry.id); }} onPointerLeave={scheduleClose}
        onKeyDown={(event) => {
          const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")]; const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          if (event.key === "Escape" || event.key === "ArrowLeft") { event.preventDefault(); closeDesktop(true); }
          if (event.key === "ArrowDown") { event.preventDefault(); links[(index + 1) % links.length]?.focus(); }
          if (event.key === "ArrowUp") { event.preventDefault(); links[(index - 1 + links.length) % links.length]?.focus(); }
        }}
        className="fixed z-[60] w-[340px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 motion-reduce:transition-none">
        <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{t(openEntry.label.id, openEntry.label.en)}</p>
        <div className="space-y-1">{openEntry.children.map((item) => { const Icon = item.icon; const isActive = active.itemId === item.id; const badge = badgeFor(item.badgeKey); return <Link key={item.id} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={cn("flex min-h-14 items-start gap-3 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", isActive ? "bg-violet-50 text-violet-800 ring-1 ring-violet-200" : "hover:bg-slate-50")}><span className="mt-0.5 rounded-md bg-slate-100 p-1.5"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(item.label.id, item.label.en)}</span><span className="block text-xs leading-5 text-slate-500">{item.description && t(item.description.id, item.description.en)}</span></span>{badge > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">{formatSidebarBadge(badge)}</span>}</Link>; })}</div>
      </div>}
    </div>

    <div className="space-y-1 lg:hidden">
      {entries.map((entry) => entry.kind === "direct" ? directLink(entry) : <div key={entry.id}>
        <button type="button" aria-expanded={mobileGroup === entry.id} aria-controls={`sidebar-mobile-${entry.id}`} onClick={() => setMobileGroup((current) => current === entry.id ? null : entry.id)} className={cn("relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium", active.groupId === entry.id ? "bg-violet-50 text-violet-700" : "text-sidebar-foreground hover:bg-sidebar-accent")}><entry.icon className="h-4 w-4" /><span className="flex-1 text-left">{t(entry.label.id, entry.label.en)}</span>{groupHasNotification(entry.id, badgeCounts) && mobileGroup !== entry.id && <span className="h-2 w-2 rounded-full bg-blue-600" />}<ChevronDown className={cn("h-4 w-4 transition-transform", mobileGroup !== entry.id && "-rotate-90")} /></button>
        {mobileGroup === entry.id && <div id={`sidebar-mobile-${entry.id}`} className="ml-4 space-y-1 border-l border-slate-200 pl-2">{entry.children.map((item) => directLink(item))}</div>}
      </div>)}
    </div>
  </div>;
}
