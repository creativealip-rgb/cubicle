import Link from "next/link";
import { BookOpen, Globe, FileText, Clock, Briefcase, Users, FileCheck2, Sparkles, Settings, Rocket, LifeBuoy } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DocsCard } from "@/components/docs/doc-shell";

const GUIDES = [
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
      id: "Dari catat waktu sampai terima bayaran. Fixed price, hourly, dan retainer.",
      en: "From time tracking to getting paid. Fixed price, hourly, and retainer.",
    },
  },
  {
    href: "/app/docs/time-tracking",
    icon: Clock,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Time Tracking", en: "Time Tracking" },
    desc: {
      id: "Timer, input manual, timesheet mingguan. Siap ditagih.",
      en: "Timer, manual entry, weekly timesheet. Ready for invoicing.",
    },
  },
  {
    href: "/app/docs/projects",
    icon: Briefcase,
    category: { id: "Pekerjaan", en: "Work" },
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    desc: {
      id: "Kelola pipeline proyek & task. Kanban board, priority, assignee, deadline.",
      en: "Manage your project & task pipeline. Kanban board, priority, assignee, deadline.",
    },
  },
  {
    href: "/app/docs/client-portal",
    icon: Users,
    category: { id: "Klien", en: "Clients" },
    title: { id: "Client Portal", en: "Client Portal" },
    desc: {
      id: "Share progres, file, dan invoice ke klien. Approval task real-time.",
      en: "Share progress, files, and invoices with clients. Real-time task approval.",
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
    href: "/app/docs/ai-studio",
    icon: Sparkles,
    category: { id: "AI", en: "AI" },
    title: { id: "AI Studio & Assistant", en: "AI Studio & Assistant" },
    desc: {
      id: "Generator brief/prompt bilingual (18 preset) dan Asisten RAG workspace.",
      en: "Bilingual brief/prompt generator (18 presets) and workspace RAG Assistant.",
    },
  },
];

export default async function DocsPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Dokumentasi", "Documentation")}</h1>
          <p className="app-page-description">
            {t("Panduan lengkap semua fitur Cubiqlo.", "Complete guides for all Cubiqlo features.")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <DocsCard
              key={guide.href}
              href={guide.href}
              icon={Icon}
              title={lang === "en" ? guide.title.en : guide.title.id}
              description={lang === "en" ? guide.desc.en : guide.desc.id}
              category={lang === "en" ? guide.category.en : guide.category.id}
            />
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("Butuh bantuan lebih lanjut?", "Need further help?")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              "Jika tidak menemukan jawaban di panduan, kamu bisa buat tiket bantuan atau hubungi tim support.",
              "If you cannot find your answer in the guides, create a support ticket or contact our team."
            )}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <Link href="/app/support">
            <LifeBuoy className="h-4 w-4" />
            {t("Bantuan & Support", "Help & Support")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
