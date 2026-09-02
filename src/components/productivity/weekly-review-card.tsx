import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ArrowRight } from "lucide-react";

export function WeeklyReviewCard({
  rate,
  goalSummary,
  headline,
  attentionHabit,
  focusGoal,
  stagnantGoals,
  t,
}: {
  rate: number;
  goalSummary: string;
  headline: string;
  attentionHabit: string | null;
  focusGoal: string | null;
  stagnantGoals: number;
  t: (id: string, en: string) => string;
}) {
  return (
    <Card className="rounded-3xl border bg-card shadow-sm">
      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted text-foreground shadow-sm">
              <CalendarCheck className="size-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t("Review & Ritme Mingguan", "Weekly Rhythm & Review")}
              </h2>
              <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                {headline}
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-semibold text-violet-600 hover:text-violet-700 p-0">
            <Link href="/app/productivity?tab=habits">
              {t("Detail", "Details")} <ArrowRight className="ml-0.5 size-3" />
            </Link>
          </Button>
        </div>

        {/* Consistency Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("Konsistensi Kebiasaan", "Habit Consistency")}</span>
            <span className="font-bold text-foreground">{rate}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        {/* Quick Insight Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
          <span className="rounded-xl border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {goalSummary}
          </span>
          {stagnantGoals > 0 && (
            <span className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              {stagnantGoals} {t("stagnan 7 hari", "stagnant (7d)")}
            </span>
          )}
          {attentionHabit && (
            <span className="rounded-xl border border-red-200/80 bg-red-50/50 px-2.5 py-1 text-[11px] font-medium text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              ⚠️ {attentionHabit}
            </span>
          )}
          {focusGoal && (
            <span className="rounded-xl border border-violet-200/80 bg-violet-50/50 px-2.5 py-1 text-[11px] font-medium text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300">
              🎯 {focusGoal}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StreakRecoveryCard({ t }: { t: (id: string, en: string) => string }) {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      {t(
        "Satu hari terlewat bukan gagal. Kembali hari ini untuk menjaga ritme.",
        "One missed day is not failure. Come back today to keep your rhythm.",
      )}
    </p>
  );
}
