import Link from "next/link";
import { BookOpen, Globe, FileText, Clock, Briefcase, Users, Palette } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

const GUIDES = [
  {
    href: "/app/docs/landing-page",
    icon: Globe,
    title: { id: "Landing Page Builder", en: "Landing Page Builder" },
    desc: {
      id: "Bikin landing page profesional dengan drag & drop. 8 tema, mobile editor, SEO, publish, contact form.",
      en: "Build professional landing pages with drag & drop. 8 themes, mobile editor, SEO, publish, contact form.",
    },
  },
  {
    href: "/app/docs/invoice",
    icon: FileText,
    title: { id: "Invoice & Pembayaran", en: "Invoice & Payments" },
    desc: {
      id: "Dari catat waktu sampai terima bayaran. Fixed price, hourly, retainer, package.",
      en: "From time tracking to getting paid. Fixed price, hourly, retainer, package.",
    },
  },
  {
    href: "/app/docs/time-tracking",
    icon: Clock,
    title: { id: "Time Tracking", en: "Time Tracking" },
    desc: {
      id: "Timer, input manual, timesheet mingguan. Siap ditagih.",
      en: "Timer, manual entry, weekly timesheet. Ready for invoicing.",
    },
  },
  {
    href: "/app/docs/projects",
    icon: Briefcase,
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    desc: {
      id: "Kelola pipeline proyek & task. Kanban board, priority, assignee, deadline.",
      en: "Manage your project & task pipeline. Kanban board, priority, assignee, deadline.",
    },
  },
  {
    href: "/app/docs/client-portal",
    icon: Users,
    title: { id: "Client Portal", en: "Client Portal" },
    desc: {
      id: "Share progres, file, dan invoice ke klien. Approval task real-time.",
      en: "Share progress, files, and invoices with clients. Real-time task approval.",
    },
  },
];

export default async function DocsPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Dokumentasi", "Documentation")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("Panduan lengkap semua fitur Cubiqlo.", "Complete guides for all Cubiqlo features.")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link
              key={guide.href}
              href={guide.href}
              className="group flex gap-4 rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {lang === "en" ? guide.title.en : guide.title.id}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {lang === "en" ? guide.desc.en : guide.desc.id}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("Butuh bantuan?", "Need help?")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "Jelajahi panduan di atas untuk mempelajari setiap fitur Cubiqlo.",
            "Explore the guides above to learn each Cubiqlo feature."
          )}
        </p>
      </div>
    </div>
  );
}
