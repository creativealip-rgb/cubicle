export type PortalLang = "id" | "en";

export function normalizePortalLang(value: unknown): PortalLang {
  return value === "en" ? "en" : "id";
}

export function portalLocale(lang: PortalLang) {
  return lang === "en" ? "en-US" : "id-ID";
}

const STATUS_LABELS: Record<string, [string, string]> = {
  active: ["Aktif", "Active"],
  archived: ["Diarsipkan", "Archived"],
  cancelled: ["Dibatalkan", "Cancelled"],
  completed: ["Selesai", "Completed"],
  confirmed: ["Dikonfirmasi", "Confirmed"],
  draft: ["Draf", "Draft"],
  in_progress: ["Sedang berjalan", "In progress"],
  invoiced: ["Ditagihkan", "Invoiced"],
  overdue: ["Terlambat", "Overdue"],
  paid: ["Lunas", "Paid"],
  pending: ["Menunggu", "Pending"],
  rejected: ["Ditolak", "Rejected"],
  sent: ["Terkirim", "Sent"],
};

export function portalStatusLabel(status: string, lang: PortalLang) {
  const labels = STATUS_LABELS[status.toLowerCase()];
  return labels ? labels[lang === "en" ? 1 : 0] : status;
}

export function portalRequestStatusLabel(status: string, lang: PortalLang) {
  return portalStatusLabel(status, lang);
}

export function portalProjectProgressLabel(
  status: string,
  completed: number,
  total: number,
  lang: PortalLang,
) {
  if (status === "active" && total > 0 && completed >= total) {
    return lang === "en"
      ? "All tasks completed · awaiting closure"
      : "Semua tugas selesai · menunggu penutupan";
  }
  if (total === 0) return lang === "en" ? "No tasks yet" : "Belum ada tugas";
  return lang === "en"
    ? `${completed}/${total} tasks completed`
    : `${completed}/${total} tugas selesai`;
}
