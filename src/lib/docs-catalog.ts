import {
  Rocket,
  Settings,
  Globe,
  FileText,
  Clock,
  Briefcase,
  Users,
  FileCheck2,
  Wrench,
  Layers,
  ClipboardList,
  Sparkles,
  Receipt,
  Calendar,
  Target,
  NotebookPen,
  ShieldCheck,
  PieChart,
  Mail,
} from "lucide-react";

export const DOCS_CATALOG = [
  {
    href: "/app/docs/getting-started",
    icon: Rocket,
    category: { id: "Panduan", en: "Guide" },
    title: { id: "Panduan Alur Operasional (End-to-End)", en: "Operational Workflow Guide (End-to-End)" },
    desc: {
      id: "Panduan lengkap mulai dari Tambah Klien, Buat Proyek, Kelola Task, hingga Terbitkan Invoice.",
      en: "Complete step-by-step guide from Adding Clients, Creating Projects, Managing Tasks, to Invoicing.",
    },
  },
  {
    href: "/app/docs/workspace-settings",
    icon: Settings,
    category: { id: "Pengaturan", en: "Settings" },
    title: { id: "Pengaturan & Setup Workspace", en: "Workspace Setup & Settings" },
    desc: {
      id: "Cara setup profil bisnis, branding, Reply-To email, manajemen tim, dan langganan QRIS.",
      en: "How to set up business profile, branding, Reply-To email, team management, and QRIS plans.",
    },
  },
  {
    href: "/app/docs/security-2fa",
    icon: ShieldCheck,
    category: { id: "Keamanan", en: "Security" },
    title: { id: "Keamanan Akun, 2FA & Passkey", en: "Account Security, 2FA & Passkeys" },
    desc: {
      id: "Panduan autentikasi multi-faktor: Passkey biometrik, TOTP Authenticator, dan 10 Backup Recovery Codes.",
      en: "Multi-factor authentication guide: Biometric Passkeys, TOTP Authenticator, and 10 Backup Recovery Codes.",
    },
  },
  {
    href: "/app/docs/landing-page",
    icon: Globe,
    category: { id: "Website", en: "Website" },
    title: { id: "Landing Page Builder", en: "Landing Page Builder" },
    desc: {
      id: "Bikin landing page profesional dengan drag & drop. 8 tema, mobile editor, SEO, publish, contact form.",
      en: "Build professional landing pages with drag & drop. 8 themes, mobile editor, SEO, publish, contact form.",
    },
  },
  {
    href: "/app/docs/invoice",
    icon: FileText,
    category: { id: "Keuangan", en: "Finance" },
    title: { id: "Invoice & Pembayaran", en: "Invoice & Payments" },
    desc: {
      id: "Dari catat waktu sampai terima bayaran. Fixed price, hourly, recurring invoice otomatis, dan retainer.",
      en: "From time tracking to getting paid. Fixed price, hourly, automated recurring invoices, and retainer.",
    },
  },
  {
    href: "/app/docs/expenses",
    icon: Receipt,
    category: { id: "Keuangan", en: "Finance" },
    title: { id: "Pengeluaran & Anggaran 50/30/20", en: "Expenses & 50/30/20 Budget" },
    desc: {
      id: "Pencatatan pengeluaran operasional bisnis dan pengelolaan anggaran finansial pribadi 50/30/20.",
      en: "Track operational business expenses and manage personal finance 50/30/20 budget allocations.",
    },
  },
  {
    href: "/app/docs/reports",
    icon: PieChart,
    category: { id: "Keuangan", en: "Finance" },
    title: { id: "Laporan Finansial & Arus Kas", en: "Financial Reports & Cash Flow" },
    desc: {
      id: "Analisa laba bersih (net profit), margin operasional, piutang (AR aging), serta chart Donut 50/30/20.",
      en: "Analyze net profit trends, operational margins, AR aging, and interactive 50/30/20 Donut charts.",
    },
  },
  {
    href: "/app/docs/time-tracking",
    icon: Clock,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Waktu & Timesheet", en: "Time & Timesheet" },
    desc: {
      id: "Timer proyek realtime, log manual harian, timesheet mingguan 7-hari, dan ekspor PDF siap tagih.",
      en: "Realtime project timer, daily manual logs, 7-day weekly timesheet, and billable PDF exports.",
    },
  },
  {
    href: "/app/docs/calendar",
    icon: Calendar,
    category: { id: "Jadwal", en: "Scheduling" },
    title: { id: "Kalender & Booking Janji Temu", en: "Calendar & Appointment Booking" },
    desc: {
      id: "Aturan ketersediaan mingguan, link booking publik kustom (/booking/slug), dan ekspor jadwal (.ics).",
      en: "Weekly availability rules, custom public booking link (/booking/slug), and .ics calendar sync.",
    },
  },
  {
    href: "/app/docs/productivity",
    icon: Target,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Target & Habit Tracker", en: "Goals & Habit Tracker" },
    desc: {
      id: "Manajemen target bertahap dengan progress milestones, daily habit check-in, dan visual mini heatmap 35-hari.",
      en: "Milestone-based goal tracking, daily habit check-in, and interactive 35-day mini visual heatmaps.",
    },
  },
  {
    href: "/app/docs/notes",
    icon: NotebookPen,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Personal Notes & Journal", en: "Personal Notes & Journal" },
    desc: {
      id: "Catatan markdown pribadi, tab terorganisir, auto-save, konversi catatan jadi task proyek, dan jurnal harian.",
      en: "Private markdown notes, organized tabs, auto-save, note-to-task conversion, and daily reflection journals.",
    },
  },
  {
    href: "/app/docs/projects",
    icon: Briefcase,
    category: { id: "Pekerjaan", en: "Work" },
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    desc: {
      id: "Kelola pipeline proyek & task. Kanban board, priority, assignee, deadline, dan billing models.",
      en: "Manage project & task pipelines. Kanban boards, priority, assignees, deadlines, and billing models.",
    },
  },
  {
    href: "/app/docs/client-portal",
    icon: Users,
    category: { id: "Klien", en: "Clients" },
    title: { id: "Client Portal", en: "Client Portal" },
    desc: {
      id: "Share progres, file, dan invoice ke klien. Approval task real-time dan custom URL portal slug.",
      en: "Share progress, files, and invoices with clients. Real-time task approval and custom portal slug URLs.",
    },
  },
  {
    href: "/app/docs/proposals-contracts",
    icon: FileCheck2,
    category: { id: "Sales", en: "Sales" },
    title: { id: "Proposal & Kontrak", en: "Proposals & Contracts" },
    desc: {
      id: "Penawaran harga, penandatanganan e-sign, dan template center sales docs.",
      en: "Estimates, e-signatures, and sales doc template center.",
    },
  },
  {
    href: "/app/docs/services",
    icon: Wrench,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Layanan", en: "Services" },
    desc: {
      id: "Katalog layanan workspace: harga, satuan, dan kategori standar.",
      en: "Workspace service catalog: pricing, units, and standard categories.",
    },
  },
  {
    href: "/app/docs/templates",
    icon: Layers,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Template Center", en: "Template Center" },
    desc: {
      id: "Template Center: template proposal, kontrak, dan invoice.",
      en: "Template Center: proposal, contract, and invoice templates.",
    },
  },
  {
    href: "/app/docs/questionnaires",
    icon: ClipboardList,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Formulir & Kuesioner", en: "Forms & Questionnaires" },
    desc: {
      id: "Form intake & brief klien. Jawaban masuk langsung jadi brief proyek.",
      en: "Client intake forms & briefs. Answers automatically convert into project briefs.",
    },
  },
  {
    href: "/app/docs/ai-studio",
    icon: Sparkles,
    category: { id: "AI", en: "AI" },
    title: { id: "Prompt Studio & AI Assistant", en: "Prompt Studio & AI Assistant" },
    desc: {
      id: "Generator brief/prompt 17 preset (Social Media, Ads, Product, Video, Brand) dan Asisten RAG workspace.",
      en: "17-preset prompt generator (Social Media, Ads, Product, Video, Brand) and workspace RAG Assistant.",
    },
  },
  {
    href: "/app/docs/email",
    icon: Mail,
    category: { id: "Komunikasi", en: "Communication" },
    title: { id: "Email Bisnis & Kotak Masuk", en: "Business Email & Inbox" },
    desc: {
      id: "Integrasi email bisnis kustom, notifikasi pengiriman invoice/proposal, dan webmail terpusat.",
      en: "Custom branded email integration, invoice/proposal dispatch notifications, and unified webmail.",
    },
  },
];
