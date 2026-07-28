import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Brain, Briefcase, BriefcaseBusiness, Calendar, CheckSquare, Clock, FileText,
  FolderOpen, LayoutDashboard, NotebookPen, Package, Sparkles, Users, Wallet,
} from "lucide-react";

export type LocalizedText = { id: string; en: string };
export type SidebarBadgeKey = "myOpenTasks" | "unpaidInvoices";
export type SidebarBadgeCounts = Partial<Record<SidebarBadgeKey, number>>;
export type SidebarGroupId = "work" | "finance" | "personal" | "ai";
export type WorkspaceRole = "owner" | "member" | "viewer";

export type DirectNavItem = {
  kind: "direct"; id: string; href: string; icon: LucideIcon; label: LocalizedText;
  description?: LocalizedText; badgeKey?: SidebarBadgeKey;
};
export type NavGroup = {
  kind: "group"; id: SidebarGroupId; icon: LucideIcon; label: LocalizedText;
  children: DirectNavItem[]; ownerOnly?: boolean;
};
export type NavigationEntry = DirectNavItem | NavGroup;

const direct = (id: string, href: string, icon: LucideIcon, label: LocalizedText, description?: LocalizedText, badgeKey?: SidebarBadgeKey): DirectNavItem =>
  ({ kind: "direct", id, href, icon, label, description, badgeKey });

export const appNavigation: NavigationEntry[] = [
  direct("dashboard", "/app/dashboard", LayoutDashboard, { id: "Dashboard", en: "Dashboard" }),
  { kind: "group", id: "work", icon: Briefcase, label: { id: "Pekerjaan", en: "Work" }, children: [
    direct("clients", "/app/clients", Users, { id: "Klien", en: "Clients" }, { id: "Kelola relasi, data, dan portal klien", en: "Manage client relationships, data, and portals" }),
    direct("projects", "/app/projects", Briefcase, { id: "Proyek", en: "Projects" }, { id: "Pantau pekerjaan dan progres proyek", en: "Track project work and progress" }),
    direct("services", "/app/services", BriefcaseBusiness, { id: "Layanan", en: "Services" }, { id: "Katalog layanan dasar", en: "Base service catalog" }),
    direct("packages", "/app/packages", Package, { id: "Paket", en: "Packages" }, { id: "Atur paket harga lama", en: "Manage legacy pricing packages" }),
    direct("tasks", "/app/tasks", CheckSquare, { id: "Tugas", en: "Tasks" }, { id: "Lihat tugas terbuka dan prioritas", en: "Review open tasks and priorities" }, "myOpenTasks"),
    direct("activities", "/app/activities", Clock, { id: "Activity", en: "Activities" }, { id: "Katalog activity workspace", en: "Workspace activity catalog" }),
  ]},
  direct("time", "/app/time", Clock, { id: "Waktu", en: "Time" }),
  direct("calendar", "/app/calendar", Calendar, { id: "Kalender", en: "Calendar" }),
  direct("files", "/app/files", FolderOpen, { id: "File", en: "Files" }),
  { kind: "group", id: "finance", icon: Wallet, label: { id: "Keuangan", en: "Finance" }, children: [
    direct("invoices", "/app/invoices", FileText, { id: "Invoice", en: "Invoices" }, { id: "Kelola tagihan dan status pembayaran", en: "Manage invoices and payment status" }, "unpaidInvoices"),
    direct("expenses", "/app/expenses", Wallet, { id: "Pengeluaran", en: "Expenses" }, { id: "Catat biaya operasional", en: "Record operating costs" }),
    direct("reports", "/app/reports", BarChart3, { id: "Laporan", en: "Reports" }, { id: "Lihat ringkasan performa", en: "View performance summaries" }),
  ]},
  { kind: "group", id: "personal", icon: NotebookPen, label: { id: "Personal", en: "Personal" }, ownerOnly: true, children: [
    direct("notes", "/app/personal", NotebookPen, { id: "Catatan", en: "Notes" }, { id: "Simpan catatan pribadi", en: "Keep private notes" }),
    direct("journal", "/app/journal", NotebookPen, { id: "Jurnal", en: "Journal" }, { id: "Tulis jurnal pekerjaan", en: "Write your work journal" }),
    direct("personal-site", "/app/personal-site", FileText, { id: "Landing Page", en: "Landing Page" }, { id: "Kelola halaman personal", en: "Manage your personal page" }),
  ]},
  { kind: "group", id: "ai", icon: Sparkles, label: { id: "AI", en: "AI" }, children: [
    direct("assistant", "/app/brain", Brain, { id: "Asisten", en: "Assistant" }, { id: "Tanya dan cek data workspace", en: "Ask questions about workspace data" }),
    direct("prompt-studio", "/app/prompts", Sparkles, { id: "Prompt Studio", en: "Prompt Studio" }, { id: "Buat materi campaign dengan AI", en: "Create campaign assets with AI" }),
  ]},
];

export function getVisibleNavigation(role?: WorkspaceRole) {
  return appNavigation.filter((entry) => entry.kind !== "group" || !entry.ownerOnly || role === "owner");
}

export function getActiveNavigation(path: string): { groupId: SidebarGroupId | null; itemId: string | null } {
  let best: { groupId: SidebarGroupId | null; itemId: string; length: number } | null = null;
  for (const entry of appNavigation) {
    const items = entry.kind === "group" ? entry.children : [entry];
    for (const item of items) {
      if (path === item.href || path.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.length) best = { groupId: entry.kind === "group" ? entry.id : null, itemId: item.id, length: item.href.length };
      }
    }
  }
  return { groupId: best?.groupId ?? null, itemId: best?.itemId ?? null };
}

export function formatSidebarBadge(count: number) { return count > 99 ? "99+" : String(count); }
export function groupHasNotification(groupId: SidebarGroupId, counts: SidebarBadgeCounts) {
  const group = appNavigation.find((entry): entry is NavGroup => entry.kind === "group" && entry.id === groupId);
  return Boolean(group?.children.some((child) => child.badgeKey && (counts[child.badgeKey] ?? 0) > 0));
}
