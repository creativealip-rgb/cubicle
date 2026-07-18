import { type BadgeProps } from "@/components/ui/badge";
import type { Lang } from "@/lib/i18n-client";

export type StatusBadgeVariant = NonNullable<BadgeProps["variant"]>;

export type StatusBadgeConfig = {
  variant: StatusBadgeVariant;
  label: string;
};

const titleize = (status: string) =>
  status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

// Local translate helper — defaults to Indonesian so existing callers that
// don't pass a lang keep working (id is the app default).
const tr = (lang: Lang | undefined, id: string, en: string) =>
  lang === "en" ? en : id;

export function invoiceStatusVariant(status: string, lang?: Lang): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary", label: tr(lang, "Draf", "Draft") };
    case "sent":
      return { variant: "info", label: tr(lang, "Terkirim", "Sent") };
    case "viewed":
      return { variant: "info", label: tr(lang, "Dilihat", "Viewed") };
    case "overdue":
      return { variant: "destructive", label: tr(lang, "Terlambat", "Overdue") };
    case "paid":
      return { variant: "success", label: tr(lang, "Lunas", "Paid") };
    case "payment due":
      return { variant: "destructive", label: tr(lang, "Perlu dibayar", "Payment due") };
    case "cancelled":
      return { variant: "outline", label: tr(lang, "Dibatalkan", "Cancelled") };
    case "archived":
      return { variant: "outline", label: tr(lang, "Arsip", "Archived") };
    default:
      return { variant: "outline", label: titleize(status) || tr(lang, "Tidak diketahui", "Unknown") };
  }
}

export function taskStatusVariant(status: string, lang?: Lang): StatusBadgeConfig {
  switch (status) {
    case "todo":
      return { variant: "secondary", label: tr(lang, "Belum Mulai", "To Do") };
    case "in_progress":
      return { variant: "default", label: tr(lang, "Dikerjakan", "In Progress") };
    case "review":
      return { variant: "warning", label: tr(lang, "Ditinjau", "Review") };
    case "done":
      return { variant: "success", label: tr(lang, "Selesai", "Done") };
    default:
      return { variant: "outline", label: titleize(status) || tr(lang, "Tidak diketahui", "Unknown") };
  }
}

export function taskPriorityLabel(priority: string, lang?: Lang): string {
  switch (priority) {
    case "low":
      return tr(lang, "Rendah", "Low");
    case "medium":
      return tr(lang, "Sedang", "Medium");
    case "high":
      return tr(lang, "Tinggi", "High");
    case "urgent":
      return tr(lang, "Mendesak", "Urgent");
    default:
      return titleize(priority);
  }
}

export function taskPriorityColor(priority: string): string {
  switch (priority) {
    case "low":
      return "border-slate-300 text-slate-600";
    case "medium":
      return "border-blue-300 text-blue-600";
    case "high":
      return "border-amber-300 text-amber-600";
    case "urgent":
      return "border-red-300 text-red-600";
    default:
      return "border-slate-300 text-slate-600";
  }
}

export function timeEntryStatusVariant(status: string, lang?: Lang): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary", label: tr(lang, "Draf", "Draft") };
    case "submitted":
      return { variant: "info", label: tr(lang, "Diajukan", "Submitted") };
    case "approved":
      return { variant: "success", label: tr(lang, "Disetujui", "Approved") };
    case "rejected":
      return { variant: "destructive", label: tr(lang, "Ditolak", "Rejected") };
    case "invoiced":
      return { variant: "outline", label: tr(lang, "Ditagihkan", "Invoiced") };
    default:
      return { variant: "outline", label: titleize(status) || tr(lang, "Tidak diketahui", "Unknown") };
  }
}

export function projectStatusVariant(status: string, lang?: Lang): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary", label: tr(lang, "Draf", "Draft") };
    case "sent":
      return { variant: "info", label: tr(lang, "Terkirim", "Sent") };
    case "viewed":
      return { variant: "info", label: tr(lang, "Dilihat", "Viewed") };
    case "overdue":
      return { variant: "destructive", label: tr(lang, "Terlambat", "Overdue") };
    case "paid":
      return { variant: "success", label: tr(lang, "Lunas", "Paid") };
    case "cancelled":
      return { variant: "outline", label: tr(lang, "Dibatalkan", "Cancelled") };
    case "active":
      return { variant: "success", label: tr(lang, "Aktif", "Active") };
    case "completed":
    case "done":
      return { variant: "success", label: tr(lang, "Selesai", "Completed") };
    case "signed":
      return { variant: "success", label: tr(lang, "Ditandatangani", "Signed") };
    case "accepted":
      return { variant: "success", label: tr(lang, "Diterima", "Accepted") };
    case "declined":
      return { variant: "destructive", label: tr(lang, "Ditolak", "Declined") };
    case "expired":
      return { variant: "destructive", label: tr(lang, "Kedaluwarsa", "Expired") };
    case "revoked":
      return { variant: "destructive", label: tr(lang, "Dicabut", "Revoked") };
    case "on_hold":
      return { variant: "warning", label: tr(lang, "Ditunda", "On Hold") };
    case "archived":
      return { variant: "outline", label: tr(lang, "Diarsipkan", "Archived") };
    default:
      return { variant: "outline", label: titleize(status) || tr(lang, "Tidak diketahui", "Unknown") };
  }
}
