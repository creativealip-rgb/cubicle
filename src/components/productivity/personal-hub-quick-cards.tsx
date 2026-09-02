import Link from "next/link";
import { Pin, BookOpen, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QuickCaptureCard } from "@/components/productivity/quick-capture-card";

export function PersonalHubQuickCards({
  quickCaptureProps,
  pinnedNotes = [],
  lastJournal = null,
  t,
}: {
  quickCaptureProps: Parameters<typeof QuickCaptureCard>[0];
  pinnedNotes?: Array<{ id: string; title: string; dueDate: string | null }>;
  lastJournal?: { id: string; title: string; mood: string | null; createdAt: string | Date } | null;
  lang?: string;
  t: (id: string, en: string) => string;
}) {
  return (
    <div className="space-y-4">
      <QuickCaptureCard {...quickCaptureProps} />

      {(pinnedNotes.length > 0 || lastJournal) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pinnedNotes.length > 0 && (
            <Card className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Pin className="h-3.5 w-3.5" />
                  {t("Catatan Disematkan", "Pinned Notes")}
                </span>
                <Link
                  href="/app/personal"
                  className="text-[11px] font-medium text-violet-600 hover:underline inline-flex items-center gap-0.5"
                >
                  {t("Lihat semua", "View all")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {pinnedNotes.slice(0, 2).map((n) => (
                  <Link
                    key={n.id}
                    href="/app/personal"
                    className="block rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/40 truncate"
                  >
                    📌 {n.title}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {lastJournal && (
            <Card className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("Refleksi Terakhir", "Last Reflection")}
                </span>
                <Link
                  href="/app/journal"
                  className="text-[11px] font-medium text-violet-600 hover:underline inline-flex items-center gap-0.5"
                >
                  {t("Buka jurnal", "Open journal")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <Link
                href="/app/journal"
                className="block rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5">
                  {lastJournal.mood && <span>{lastJournal.mood}</span>}
                  <span className="truncate font-semibold">{lastJournal.title}</span>
                </div>
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
