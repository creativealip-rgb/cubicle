import { type BadgeProps } from "@/components/ui/badge";

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

export function invoiceStatusVariant(status: string): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary", label: "Draft" };
    case "sent":
      return { variant: "info", label: "Terkirim" };
    case "viewed":
      return { variant: "info", label: "Dilihat" };
    case "overdue":
      return { variant: "destructive", label: "Terlambat" };
    case "paid":
      return { variant: "success", label: "Lunas" };
    case "payment due":
      return { variant: "destructive", label: "Perlu dibayar" };
    case "cancelled":
      return { variant: "outline", label: "Dibatalkan" };
    default:
      return { variant: "outline", label: titleize(status) || "Tidak diketahui" };
  }
}

export function taskStatusVariant(status: string): StatusBadgeConfig {
  switch (status) {
    case "todo":
      return { variant: "secondary", label: "Todo" };
    case "in_progress":
      return { variant: "default", label: "In Progress" };
    case "review":
      return { variant: "warning", label: "Review" };
    case "done":
      return { variant: "success", label: "Done" };
    default:
      return { variant: "outline", label: titleize(status) || "Unknown" };
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

export function projectStatusVariant(status: string): StatusBadgeConfig {
  switch (status) {
    case "draft":
      return { variant: "secondary", label: "Draft" };
    case "sent":
      return { variant: "info", label: "Sent" };
    case "viewed":
      return { variant: "info", label: "Viewed" };
    case "overdue":
      return { variant: "destructive", label: "Overdue" };
    case "paid":
      return { variant: "success", label: "Paid" };
    case "cancelled":
      return { variant: "outline", label: "Cancelled" };
    case "active":
      return { variant: "success", label: "Active" };
    case "completed":
    case "done":
    case "signed":
    case "accepted":
      return { variant: "success", label: titleize(status) };
    case "declined":
    case "expired":
    case "revoked":
      return { variant: "destructive", label: titleize(status) };
    case "archived":
      return { variant: "outline", label: "Archived" };
    default:
      return { variant: "outline", label: titleize(status) || "Unknown" };
  }
}
