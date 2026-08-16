export type AssistantActionCategory = "summary" | "finance" | "work" | "clients" | "sales";
export type LocalizedText = { id: string; en: string };
export type AssistantQuickAction = {
  id: string;
  category: AssistantActionCategory;
  label: LocalizedText;
  prompt: LocalizedText;
  primary?: boolean;
};

export const assistantCategoryLabels: Record<AssistantActionCategory, LocalizedText> = {
  summary: { id: "Ringkasan", en: "Summary" }, finance: { id: "Keuangan", en: "Finance" },
  work: { id: "Pekerjaan", en: "Work" }, clients: { id: "Klien", en: "Clients" }, sales: { id: "Penjualan & Dokumen", en: "Sales & Documents" },
};

export const assistantQuickActions: AssistantQuickAction[] = [
  { id: "week-summary", category: "summary", primary: true, label: { id: "Ringkas minggu ini", en: "Summarize this week" }, prompt: { id: "Ringkas kondisi workspace minggu ini: pemasukan, pekerjaan selesai, dan yang masih terbuka.", en: "Summarize this week's workspace: revenue, completed work, and what remains open." } },
  { id: "business-health", category: "summary", label: { id: "Kondisi bisnis", en: "Business health" }, prompt: { id: "Bagaimana kondisi bisnis berdasarkan data workspace terbaru?", en: "How is the business doing based on current workspace data?" } },
  { id: "today-priority", category: "summary", primary: true, label: { id: "Prioritas hari ini", en: "Today's priorities" }, prompt: { id: "Apa prioritas pekerjaan hari ini berdasarkan tenggat dan status terbaru?", en: "What are today's work priorities based on deadlines and current status?" } },
  { id: "overdue-invoices", category: "finance", primary: true, label: { id: "Cek invoice terlambat", en: "Check overdue invoices" }, prompt: { id: "Tampilkan invoice terlambat dan berapa lama sudah jatuh tempo.", en: "Show overdue invoices and how long they have been past due." } },
  { id: "monthly-finance", category: "finance", label: { id: "Pemasukan dan pengeluaran bulan ini", en: "This month's income and expenses" }, prompt: { id: "Ringkas pemasukan dan pengeluaran bulan ini.", en: "Summarize this month's income and expenses." } },
  { id: "cash-flow", category: "finance", label: { id: "Perkirakan arus kas", en: "Forecast cash flow" }, prompt: { id: "Perkirakan arus kas berdasarkan data workspace saat ini.", en: "Forecast cash flow from current workspace data." } },
  { id: "overdue-tasks", category: "work", label: { id: "Tugas terlambat", en: "Overdue tasks" }, prompt: { id: "Tampilkan semua tugas yang terlambat.", en: "Show all overdue tasks." } },
  { id: "projects-attention", category: "work", label: { id: "Proyek perlu perhatian", en: "Projects needing attention" }, prompt: { id: "Proyek mana yang perlu perhatian dan kenapa?", en: "Which projects need attention and why?" } },
  { id: "client-follow-up", category: "clients", label: { id: "Klien perlu follow-up", en: "Clients needing follow-up" }, prompt: { id: "Klien mana yang perlu follow-up berdasarkan data terbaru?", en: "Which clients need follow-up based on current data?" } },
  { id: "client-update", category: "clients", primary: true, label: { id: "Buat update klien", en: "Draft client update" }, prompt: { id: "Bantu buat update progres untuk klien. Tanyakan klien mana yang dimaksud.", en: "Help draft a client progress update. Ask which client I mean." } },
  { id: "open-proposals", category: "sales", label: { id: "Proposal masih terbuka", en: "Open proposals" }, prompt: { id: "Tampilkan proposal yang masih terbuka.", en: "Show proposals that are still open." } },
  { id: "contracts", category: "sales", label: { id: "Cari kontrak klien", en: "Find client contracts" }, prompt: { id: "Bantu cari kontrak klien. Tanyakan klien mana yang dimaksud.", en: "Help find a client contract. Ask which client I mean." } },
  { id: "questionnaires", category: "sales", label: { id: "Ringkas questionnaire", en: "Summarize questionnaires" }, prompt: { id: "Ringkas jawaban questionnaire terbaru.", en: "Summarize recent questionnaire responses." } },
];

export const primaryAssistantActions = assistantQuickActions.filter((item) => item.primary);
export const localizeAssistantAction = (action: AssistantQuickAction, lang: string) => ({ label: action.label[lang === "id" ? "id" : "en"], prompt: action.prompt[lang === "id" ? "id" : "en"] });
