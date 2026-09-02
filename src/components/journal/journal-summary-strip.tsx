import { Card } from "@/components/ui/card";
import { BookOpen, Flame, CalendarCheck, Smile } from "lucide-react";

export function JournalSummaryStrip({
  thisWeek,
  currentStreak,
  topMood,
  totalEntries,
  t,
}: {
  thisWeek: number;
  currentStreak: number;
  topMood: string | null;
  totalEntries: number;
  t: (id: string, en: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Minggu Ini", "This Week")}
          </span>
          <CalendarCheck className="size-4 text-violet-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {thisWeek}
          </span>
          <span className="text-xs text-muted-foreground">
            {thisWeek === 1 ? t("entri", "entry") : t("entri", "entries")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Streak Menulis", "Writing Streak")}
          </span>
          <Flame className="size-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {currentStreak}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("hari", "days")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Dominan Mood", "Top Mood")}
          </span>
          <Smile className="size-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {topMood || "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {topMood ? t("tersering", "frequent") : t("belum ada", "none")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Total Entri", "Total Entries")}
          </span>
          <BookOpen className="size-4 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {totalEntries}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalEntries === 1 ? t("catatan", "entry") : t("catatan", "entries")}
          </span>
        </div>
      </Card>
    </div>
  );
}
