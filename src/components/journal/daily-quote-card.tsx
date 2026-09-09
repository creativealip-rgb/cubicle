import { Sparkles } from "lucide-react";

export function DailyQuoteCard({ quote, attribution, t }: {
  quote: string;
  attribution: string | null;

  t: (id: string, en: string) => string;
}) {
  return <section className="rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-white p-4 dark:border-violet-900 dark:from-violet-950/40 dark:to-card">
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white"><Sparkles className="size-4" /></div>
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">{t("Quote Hari Ini", "Quote of the Day")}</p>
        <blockquote className="text-sm font-medium leading-relaxed text-foreground">“{quote}”</blockquote>
        {attribution && <p className="text-xs text-muted-foreground">— {attribution}</p>}
      </div>
    </div>
  </section>;
}
