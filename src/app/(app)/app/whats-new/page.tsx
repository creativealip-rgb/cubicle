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
    <div className="mx-auto w-full max-w-[1040px] pb-10">
      <WhatsNewSeenMarker releaseId={latestProductUpdateId} />

      <header className="relative isolate overflow-hidden rounded-[28px] bg-[#171429] px-6 py-8 text-white shadow-[0_24px_70px_-35px_rgba(50,35,110,0.7)] sm:px-9 sm:py-10">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-8 top-8 hidden h-28 w-28 rotate-12 items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.07] shadow-2xl backdrop-blur sm:flex">
          <Megaphone className="h-11 w-11 -rotate-12 text-violet-200" strokeWidth={1.6} />
        </div>

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {t("Pembaruan Produk", "Product Updates")}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-[-0.035em] sm:text-[2.65rem] sm:leading-[1.08]">
            {t("Cubiqlo terus jadi lebih baik.", "Cubiqlo keeps getting better.")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
            {t(
              "Semua fitur baru, peningkatan, dan perbaikan penting—dirangkum singkat di satu tempat.",
              "All new features, improvements, and fixes—curated in one place."
            )}
          </p>
          {latestRelease && (
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
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

      <section className="relative mt-10 space-y-12 sm:mt-14" aria-label={t("Pembaruan produk", "Product updates")}>
        <div
          className="absolute bottom-10 left-[17px] top-3 w-px bg-gradient-to-b from-violet-300 via-slate-200 to-transparent sm:left-[23px] dark:from-violet-800 dark:via-slate-800"
          aria-hidden="true"
        />

        {productUpdates.map((release, releaseIndex) => (
          <article
            key={release.id}
            className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-5"
          >
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-[5px] border-background bg-violet-600 shadow-[0_0_0_1px_rgb(221_214_254)] sm:h-12 sm:w-12 sm:border-[7px]">
              <span className="h-2 w-2 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
            </div>

            <div className="min-w-0 pb-1">
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <time dateTime={release.date} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {formatDate(release.date, lang)}
                </time>
                {releaseIndex === 0 && (
                  <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                    {t("TERBARU", "LATEST")}
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)]">
                <div className="border-b border-border bg-gradient-to-r from-muted/40 to-card px-5 py-5 sm:px-7 sm:py-6">
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-card-foreground sm:text-2xl">
                    {isId ? release.title.id : release.title.en}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {isId ? release.summary.id : release.summary.en}
                  </p>
                </div>

                <div className="divide-y divide-border px-5 sm:px-7">
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
                        className="grid gap-3 py-5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-4 sm:py-6"
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.iconBox}`}>
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base font-semibold text-card-foreground sm:text-lg">{itemTitle}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${meta.badge}`}
                            >
                              {itemLabel}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:leading-7">{itemDesc}</p>

                          {item.href && itemCta && (
                            <div className="mt-3.5">
                              <Link
                                href={item.href}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                              >
                                {itemCta}
                                <ArrowUpRight className="h-3.5 w-3.5" />
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
