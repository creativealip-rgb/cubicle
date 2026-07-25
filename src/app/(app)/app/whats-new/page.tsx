import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WhatsNewSeenMarker } from "@/components/whats-new-seen-marker";
import { latestProductUpdateId, productUpdates, type ProductUpdateType } from "@/lib/product-updates";

export const metadata: Metadata = {
  title: "What’s New di Cubiqlo",
  description: "Fitur baru, peningkatan, dan perbaikan terbaru dari Cubiqlo.",
};

const typeMeta: Record<ProductUpdateType, { label: string; icon: typeof Sparkles; className: string }> = {
  new: { label: "New", icon: Sparkles, className: "border-violet-200 bg-violet-50 text-violet-700" },
  improvement: { label: "Improvement", icon: CheckCircle2, className: "border-blue-200 bg-blue-50 text-blue-700" },
  fix: { label: "Fix", icon: Wrench, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${value}T00:00:00+07:00`),
  );
}

export default function WhatsNewPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <WhatsNewSeenMarker releaseId={latestProductUpdateId} />

      <header className="overflow-hidden rounded-3xl border border-violet-100 bg-[linear-gradient(135deg,#f7f5ff_0%,#eef4ff_55%,#ffffff_100%)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex max-w-2xl items-center gap-2 text-sm font-semibold text-violet-700">
          <Sparkles className="h-4 w-4" />
          Product updates
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">What’s New di Cubiqlo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Fitur baru, peningkatan, dan perbaikan yang membantu kerja klien lebih rapi.
        </p>
      </header>

      <section className="space-y-10" aria-label="Pembaruan produk">
        {productUpdates.map((release, releaseIndex) => (
          <article key={release.id} className="relative grid gap-4 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8">
            <div className="md:pt-1">
              <time dateTime={release.date} className="text-sm font-semibold text-slate-500">
                {formatDate(release.date)}
              </time>
              {releaseIndex === 0 && (
                <Badge className="mt-2 block w-fit border-0 bg-violet-600 text-white">Latest</Badge>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{release.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{release.summary}</p>

              <div className="mt-6 divide-y divide-slate-100">
                {release.items.map((item) => {
                  const meta = typeMeta[item.type];
                  const Icon = meta.icon;
                  return (
                    <div key={`${release.id}-${item.title}`} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={meta.className}>
                          <Icon className="mr-1 h-3 w-3" />
                          {meta.label}
                        </Badge>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      {item.href && item.cta && (
                        <Link href={item.href} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">
                          {item.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
