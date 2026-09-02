import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ArrowRight, AlertCircle, Target, CheckCircle2 } from "lucide-react";

export function WeeklyReviewCard({
  rate,
  goalSummary,
  headline,
  attentionHabit,
  focusGoal,
  stagnantGoals: _stagnantGoals,
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
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shadow-sm">
              <CalendarCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t("Review & Ritme Mingguan", "Weekly Rhythm & Review")}
              </h2>
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                {headline}
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-semibold text-violet-600 hover:text-violet-700 p-0">
            <Link href="/app/productivity?tab=habits">
              {t("Lihat Semua", "View All")} <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>

        {/* Consistency Bar */}
        <div className="space-y-1.5 rounded-2xl border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">{t("Konsistensi Kebiasaan Mingguan", "Weekly Habit Consistency")}</span>
            <span className="font-bold text-foreground">{rate}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rate >= 80
                  ? "bg-emerald-500"
                  : rate >= 50
                    ? "bg-violet-600"
                    : "bg-amber-500"
              }`}
              style={{ width: `${Math.max(rate, 3)}%` }}
            />
          </div>
        </div>

        {/* Structured Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:bg-card">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">{t("Momentum Tujuan", "Goal Momentum")}</span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{goalSummary}</span>
            </div>
          </div>

          {focusGoal && (
            <div className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-violet-50/40 p-2.5 dark:bg-violet-950/20">
              <Target className="size-4 text-violet-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-400 block">{t("Fokus Utama", "Primary Focus")}</span>
                <span className="text-xs font-semibold text-violet-900 dark:text-violet-200 truncate block">{focusGoal}</span>
              </div>
            </div>
          )}

          {attentionHabit && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 dark:bg-amber-950/20 sm:col-span-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400 block">{t("Perlu Perhatian", "Needs Attention")}</span>
                <span className="text-xs font-medium text-amber-900 dark:text-amber-200">{attentionHabit} {t("belum konsisten minggu ini", "needs attention this week")}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StreakRecoveryCard({ t }: { t: (id: string, en: string) => string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 shadow-sm">
      <AlertCircle className="size-4 text-amber-600 shrink-0" />
      <span>
        {t(
          "Satu hari terlewat bukan gagal. Check-in hari ini untuk menjaga ritme konsistensi!",
          "One missed day is not failure. Check in today to keep your consistency rhythm!",
        )}
      </span>
    </div>
  );
}
