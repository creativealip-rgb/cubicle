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
  { id: "create-client", category: "clients", primary: true, label: { id: "Buat klien", en: "Create client" }, prompt: { id: "Buat klien baru. Tanyakan nama, email, dan detail kontak yang diperlukan.", en: "Create a new client. Ask for the name, email, and required contact details." } },
  { id: "create-invoice", category: "finance", primary: true, label: { id: "Buat invoice", en: "Create invoice" }, prompt: { id: "Buat invoice baru. Tanyakan klien, item, jumlah, dan tanggal jatuh tempo.", en: "Create a new invoice. Ask for the client, items, amounts, and due date." } },
  { id: "create-task", category: "work", primary: true, label: { id: "Buat tugas", en: "Create task" }, prompt: { id: "Buat tugas baru. Tanyakan judul, proyek, prioritas, dan tenggat.", en: "Create a new task. Ask for the title, project, priority, and deadline." } },
  { id: "create-project", category: "work", primary: true, label: { id: "Buat proyek", en: "Create project" }, prompt: { id: "Buat proyek baru. Tanyakan nama, klien, model penagihan, dan tenggat.", en: "Create a new project. Ask for the name, client, billing model, and deadline." } },
  { id: "start-timer", category: "work", primary: true, label: { id: "Mulai timer", en: "Start timer" }, prompt: { id: "Mulai timer untuk pekerjaan saya sekarang.", en: "Start a timer for my current work." } },
  { id: "reports", category: "summary", primary: true, label: { id: "Lihat laporan", en: "View reports" }, prompt: { id: "Buka ringkasan laporan workspace: pemasukan, pekerjaan, dan performa proyek.", en: "Show workspace reports: revenue, work, and project performance." } },
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
