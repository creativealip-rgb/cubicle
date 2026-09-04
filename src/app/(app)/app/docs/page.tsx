import Link from "next/link";
import { BookOpen, LifeBuoy, Sparkles } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DocsCard } from "@/components/docs/doc-shell";
import { PageHeader } from "@/components/ui/page-header";
import { DOCS_CATALOG } from "@/lib/docs-catalog";

export default async function DocsPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        icon={BookOpen}
        title={t("Pusat Dokumentasi", "Documentation Hub")}
        description={t(
          "Panduan lengkap dan tutorial fitur untuk memaksimalkan seluruh modul operasional Cubiqlo.",
          "Complete guides and tutorials to get the most out of all Cubiqlo operational modules.",
        )}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS_CATALOG.map((guide) => {
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
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("Butuh bantuan lebih lanjut?", "Need further help?")}</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t(
              "Jika ada fitur yang membingungkan, kamu bisa buat tiket bantuan atau hubungi tim support kami.",
              "If you cannot find your answer in the guides, create a support ticket or contact our support team.",
            )}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2 rounded-lg text-xs font-semibold">
          <Link href="/app/support">
            <LifeBuoy className="h-4 w-4" />
            {t("Bantuan & Support", "Help & Support")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
