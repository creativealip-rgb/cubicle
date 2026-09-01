import { Card } from "@/components/ui/card";
import { Target, CheckCircle2, Flame, TrendingUp } from "lucide-react";

interface ProductivityKpiProps {
  activeGoals: number;
  avgGoalProgress: number;
  habitsCompletedToday: number;
  habitsScheduledToday: number;
  bestStreak: number;
  t: (id: string, en: string) => string;
}

export function ProductivityKpiCards({
  activeGoals,
  avgGoalProgress,
  habitsCompletedToday,
  habitsScheduledToday,
  bestStreak,
  t,
}: ProductivityKpiProps) {
  const habitRatio =
    habitsScheduledToday > 0
      ? Math.round((habitsCompletedToday / habitsScheduledToday) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <Card className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">
            {t("Tujuan Aktif", "Active Goals")}
          </span>
          <Target className="size-4 text-violet-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {activeGoals}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("tujuan", "goals")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">
            {t("Rata-rata Progress", "Avg Goal Progress")}
          </span>
          <TrendingUp className="size-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {avgGoalProgress}%
          </span>
          <span className="text-xs text-muted-foreground">
            {t("selesai", "done")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">
            {t("Kebiasaan Hari Ini", "Today's Habits")}
          </span>
          <CheckCircle2 className="size-4 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {habitsCompletedToday}/{habitsScheduledToday}
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ({habitRatio}%)
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">
            {t("Streak Terbaik", "Best Streak")}
          </span>
          <Flame className="size-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {bestStreak}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("hari", "days")}
          </span>
        </div>
      </Card>
    </div>
  );
}
