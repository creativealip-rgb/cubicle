"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Megaphone, Sparkles, Wrench } from "lucide-react";
import { WhatsNewSeenMarker } from "@/components/whats-new-seen-marker";
import { latestProductUpdateId, productUpdates, type ProductUpdateType } from "@/lib/product-updates";
import { useT } from "@/lib/i18n-client";

const typeMeta: Record<
  ProductUpdateType,
  { label: { id: string; en: string }; icon: typeof Sparkles; badge: string; iconBox: string }
> = {
  new: {
    label: { id: "Baru", en: "New" },
    icon: Sparkles,
    badge: "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/60",
    iconBox: "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300",
  },
  improvement: {
    label: { id: "Peningkatan", en: "Improvement" },
    icon: CheckCircle2,
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/60",
    iconBox: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300",
  },
  fix: {
    label: { id: "Perbaikan", en: "Fix" },
    icon: Wrench,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60",
    iconBox: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  },
};

function formatDate(value: string, lang: string) {
  const [year, month, day] = value.split("-").map(Number);
  const locale = lang === "id" ? "id-ID" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0)));
}

export default function WhatsNewPage() {
  const { lang, t } = useT();
  const isId = lang === "id";
  const latestRelease = productUpdates[0];

  return (
    <div className="mx-auto w-full max-w-[960px] pb-10">
      <WhatsNewSeenMarker releaseId={latestProductUpdateId} />

      {/* Hero Header - Sleek & Compact */}
      <header className="relative isolate overflow-hidden rounded-2xl bg-[#171429] px-5 py-6 text-white shadow-[0_16px_50px_-25px_rgba(50,35,110,0.6)] sm:px-8 sm:py-7">
        <div className="absolute -right-16 -top-28 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-6 top-6 hidden h-20 w-20 rotate-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-xl backdrop-blur sm:flex">
          <Megaphone className="h-8 w-8 -rotate-12 text-violet-200" strokeWidth={1.6} />
        </div>

        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-violet-100 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {t("Pembaruan Produk", "Product Updates")}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("Cubiqlo terus jadi lebih baik.", "Cubiqlo keeps getting better.")}
          </h1>
          <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
            {t(
              "Semua fitur baru, peningkatan, dan perbaikan penting—dirangkum singkat di satu tempat.",
              "All new features, improvements, and fixes—curated in one place."
            )}
          </p>
          {latestRelease && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-white">{t("Update terbaru", "Latest update")}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
              <span>{formatDate(latestRelease.date, lang)}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
              <span>
                {latestRelease.items.length} {t("pembaruan", "updates")}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Timeline Section */}
      <section className="relative mt-8 space-y-8 sm:mt-10" aria-label={t("Pembaruan produk", "Product updates")}>
        <div
          className="absolute bottom-6 left-[15px] top-2.5 w-px bg-gradient-to-b from-violet-300 via-slate-200 to-transparent sm:left-[19px] dark:from-violet-800 dark:via-slate-800"
          aria-hidden="true"
        />

        {productUpdates.map((release, releaseIndex) => (
          <article
            key={release.id}
            className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-4"
          >
            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-[4px] border-background bg-violet-600 shadow-[0_0_0_1px_rgb(221_214_254)] sm:h-10 sm:w-10 sm:border-[5px]">
              <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" />
            </div>

            <div className="min-w-0 pb-1">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <time dateTime={release.date} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {formatDate(release.date, lang)}
                </time>
                {releaseIndex === 0 && (
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                    {t("TERBARU", "LATEST")}
                  </span>
                )}
              </div>

              {/* Release Container Card */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="border-b border-border bg-gradient-to-r from-muted/30 to-card px-4 py-3 sm:px-5 sm:py-3.5">
                  <h2 className="text-base font-bold tracking-tight text-card-foreground sm:text-lg">
                    {isId ? release.title.id : release.title.en}
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                    {isId ? release.summary.id : release.summary.en}
                  </p>
                </div>

                <div className="divide-y divide-border/80 px-4 sm:px-5">
                  {release.items.map((item, itemIdx) => {
                    const meta = typeMeta[item.type];
                    const Icon = meta.icon;
                    const itemTitle = isId ? item.title.id : item.title.en;
                    const itemDesc = isId ? item.description.id : item.description.en;
                    const itemCta = item.cta ? (isId ? item.cta.id : item.cta.en) : null;
                    const itemLabel = isId ? meta.label.id : meta.label.en;

                    return (
                      <div
                        key={`${release.id}-${itemIdx}`}
                        className="grid gap-2.5 py-3 sm:grid-cols-[32px_minmax(0,1fr)] sm:gap-3 sm:py-3.5"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBox}`}>
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-card-foreground">{itemTitle}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-bold ring-1 ring-inset ${meta.badge}`}
                            >
                              {itemLabel}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{itemDesc}</p>

                          {item.href && itemCta && (
                            <div className="mt-2">
                              <Link
                                href={item.href}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                              >
                                {itemCta}
                                <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
