import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Brain, Briefcase, BriefcaseBusiness, Calendar, CheckSquare, Clock,
  FileCheck2, FileSpreadsheet, FileText, FolderOpen, LayoutDashboard, NotebookPen,
  Sparkles, Users, Wallet, Wrench, ClipboardList,
} from "lucide-react";

export type LocalizedText = { id: string; en: string };
export type SidebarBadgeKey = "myOpenTasks" | "unpaidInvoices" | "draftProposals" | "draftContracts";
export type SidebarBadgeCounts = Partial<Record<SidebarBadgeKey, number>>;
export type SidebarGroupId = "work" | "business" | "finance" | "personal" | "ai";
export type WorkspaceRole = "owner" | "member" | "viewer";

export type DirectNavItem = {
  kind: "direct"; id: string; href: string; aliases?: string[]; icon: LucideIcon; label: LocalizedText;
  description?: LocalizedText; badgeKey?: SidebarBadgeKey;
};
export type NavGroup = {
  kind: "group"; id: SidebarGroupId; icon: LucideIcon; label: LocalizedText;
  children: DirectNavItem[]; ownerOnly?: boolean;
};
export type NavigationEntry = DirectNavItem | NavGroup;

const direct = (
  id: string,
  href: string,
  icon: LucideIcon,
  label: LocalizedText,
  description?: LocalizedText,
  badgeKey?: SidebarBadgeKey,
  aliases?: string[],
): DirectNavItem => ({ kind: "direct", id, href, aliases, icon, label, description, badgeKey });

export const appNavigation: NavigationEntry[] = [
  direct("dashboard", "/app/dashboard", LayoutDashboard, { id: "Dashboard", en: "Dashboard" }),
  { kind: "group", id: "work", icon: Briefcase, label: { id: "Pekerjaan", en: "Work" }, children: [
    direct("clients", "/app/clients", Users, { id: "Klien", en: "Clients" }, { id: "Kelola data, kontak, dan portal klien", en: "Manage client data, contacts, and portals" }),
    direct("projects", "/app/projects", Briefcase, { id: "Proyek", en: "Projects" }, { id: "Kelola engagement, scope, dan progres kerja", en: "Manage engagements, scope, and work progress" }),
    direct("tasks", "/app/tasks", CheckSquare, { id: "Tugas", en: "Tasks" }, { id: "Kelola pekerjaan konkret, assignee, dan deadline", en: "Manage concrete work, assignees, and deadlines" }, "myOpenTasks"),
    direct("files", "/app/files", FolderOpen, { id: "File", en: "Files" }),
  ]},
  direct("time", "/app/time", Clock, { id: "Waktu", en: "Time" }, undefined, undefined, ["/app/activities"]),
  { kind: "group", id: "business", icon: BriefcaseBusiness, label: { id: "Bisnis", en: "Business" }, children: [
    direct("proposals", "/app/proposals", FileSpreadsheet, { id: "Proposal", en: "Proposals" }, { id: "Kelola penawaran dan proposal", en: "Manage client proposals and estimates" }, "draftProposals"),
    direct("contracts", "/app/contracts", FileCheck2, { id: "Kontrak", en: "Contracts" }, { id: "Kelola kontrak dan kesepakatan", en: "Manage client contracts and agreements" }, "draftContracts"),
    direct("services", "/app/services", Wrench, { id: "Layanan", en: "Services" }, { id: "Kelola katalog layanan milik Anda", en: "Manage your pure service catalog" }),
    direct("personal-site", "/app/personal-site", FileText, { id: "Landing Page", en: "Landing Page" }, { id: "Kelola halaman personal", en: "Manage your personal page" }),
    direct("questionnaires", "/app/questionnaires", ClipboardList, { id: "Formulir", en: "Forms" }, { id: "Form intake & brief klien", en: "Client intake forms & briefs" }),
    direct("templates", "/app/templates", ClipboardList, { id: "Template", en: "Templates" }, { id: "Kelola template proposal, kontrak, dan invoice", en: "Manage proposal, contract, and invoice templates" }),
  ]},
  { kind: "group", id: "finance", icon: Wallet, label: { id: "Keuangan", en: "Finance" }, children: [
    direct("invoices", "/app/invoices", FileText, { id: "Invoice", en: "Invoices" }, { id: "Kelola tagihan, pembayaran, dan waktu belum ditagihkan", en: "Manage invoices, payments, and uninvoiced time" }, "unpaidInvoices"),
    direct("expenses", "/app/expenses", Wallet, { id: "Pengeluaran", en: "Expenses" }, { id: "Catat biaya operasional", en: "Record operating costs" }),
    direct("reports", "/app/reports", BarChart3, { id: "Laporan", en: "Reports" }, { id: "Analisis keuangan dan performa waktu", en: "Analyze financial and time performance" }),
  ]},
  direct("calendar", "/app/calendar", Calendar, { id: "Kalender", en: "Calendar" }),
  direct("productivity", "/app/productivity", CheckSquare, { id: "Produktivitas", en: "Productivity" }, { id: "Kelola tujuan dan kebiasaan pribadi", en: "Manage personal goals and habits" }),
  { kind: "group", id: "personal", icon: NotebookPen, label: { id: "Personal", en: "Personal" }, ownerOnly: true, children: [
    direct("notes", "/app/personal", NotebookPen, { id: "Catatan", en: "Notes" }, { id: "Simpan catatan pribadi", en: "Keep private notes" }),
    direct("journal", "/app/journal", NotebookPen, { id: "Jurnal", en: "Journal" }, { id: "Tulis jurnal pekerjaan", en: "Write your work journal" }),
  ]},
  { kind: "group", id: "ai", icon: Sparkles, label: { id: "AI", en: "AI" }, children: [
    direct("prompt-studio", "/app/prompts", Sparkles, { id: "Prompt Studio", en: "Prompt Studio" }, { id: "Buat materi campaign dengan AI", en: "Create campaign assets with AI" }),
    direct("assistant", "/app/brain", Brain, { id: "Asisten AI", en: "AI Assistant" }, { id: "Tanya dan cek data workspace", en: "Ask questions about workspace data" }),
  ]},
];

export function getVisibleNavigation(role?: WorkspaceRole) {
  return appNavigation.filter((entry) => entry.kind !== "group" || !entry.ownerOnly || role === "owner");
}

function matchesRoute(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export function getActiveNavigation(path: string): { groupId: SidebarGroupId | null; itemId: string | null } {
  let best: { groupId: SidebarGroupId | null; itemId: string; length: number } | null = null;
  for (const entry of appNavigation) {
    const items = entry.kind === "group" ? entry.children : [entry];
    for (const item of items) {
      for (const route of [item.href, ...(item.aliases ?? [])]) {
        if (matchesRoute(path, route) && (!best || route.length > best.length)) {
          best = { groupId: entry.kind === "group" ? entry.id : null, itemId: item.id, length: route.length };
        }
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
