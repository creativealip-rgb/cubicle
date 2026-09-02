import { Card } from "@/components/ui/card";
import { Target, CheckCircle2, Flame, TrendingUp } from "lucide-react";

interface ProductivityKpiProps {
  activeGoals: number;
  avgGoalProgress: number;
  habitsCompletedToday: number;
  habitsScheduledToday: number;
  bestStreak: number;
  completedDays: number;
  t: (id: string, en: string) => string;
}

export function ProductivityKpiCards({
  activeGoals,
  avgGoalProgress,
  habitsCompletedToday,
  habitsScheduledToday,
  bestStreak,
  completedDays,
  t,
}: ProductivityKpiProps) {
  const habitRatio =
    habitsScheduledToday > 0
      ? Math.round((habitsCompletedToday / habitsScheduledToday) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Card className="rounded-xl border bg-card p-3 shadow-none">
        <div className="flex items-center justify-between gap-1 text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {t("Tujuan Aktif", "Active Goals")}
          </span>
          <Target className="size-3.5 text-violet-500" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {activeGoals}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {activeGoals === 1 ? t("tujuan", "goal") : t("tujuan", "goals")}
          </span>
        </div>
      </Card>

      <Card className="rounded-xl border bg-card p-3 shadow-none">
        <div className="flex items-center justify-between gap-1 text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {t("Rata-rata Progress", "Avg Goal Progress")}
          </span>
          <TrendingUp className="size-3.5 text-emerald-500" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {avgGoalProgress}%
          </span>
          <span className="text-[11px] text-muted-foreground">
            {t("selesai", "done")}
          </span>
        </div>
      </Card>

      <Card className="rounded-xl border bg-card p-3 shadow-none">
        <div className="flex items-center justify-between gap-1 text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {t("Kebiasaan Hari Ini", "Today's Habits")}
          </span>
          <CheckCircle2 className="size-3.5 text-blue-500" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {habitsCompletedToday}/{habitsScheduledToday}
          </span>
          <span className={habitRatio > 0 ? "text-[11px] font-medium text-emerald-600 dark:text-emerald-400" : "text-[11px] font-medium text-muted-foreground"}>
            ({habitRatio}%)
          </span>
        </div>
      </Card>

      <Card className="rounded-xl border bg-card p-3 shadow-none">
        <div className="flex items-center justify-between gap-1 text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {t("Streak Terbaik", "Best Streak")}
          </span>
          <Flame className="size-3.5 text-amber-500" />
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {bestStreak}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {bestStreak === 1 ? t("hari", "day") : t("hari", "days")}
          </span>
          <span className="basis-full text-[10px] text-muted-foreground truncate">{completedDays} {t("hari check-in", "completed days")}</span>
        </div>
      </Card>
    </div>
  );
}
