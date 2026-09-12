import type { HeatmapCell, WeeklyConsistency } from "@/lib/personal-productivity/visuals";

interface HabitHeatmapProps {
  cells: HeatmapCell[];
  weeklyTrends: WeeklyConsistency[];
  t: (id: string, en: string) => string;
  habitId?: string;
  toggleDateAction?: (formData: FormData) => Promise<void>;
}

export function HabitHeatmap({ weeklyTrends, t }: HabitHeatmapProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-card">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span>{t("Tren 5 Minggu", "Weekly Trend (5 Weeks)")}</span>
          <span>{t("Penyelesaian", "Rate")}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {weeklyTrends.map((week) => (
            <div key={week.startDate} className="space-y-1 text-center">
              <div className="relative flex h-9 w-full flex-col justify-end overflow-hidden rounded-md bg-muted/40 p-0.5">
                <div className="w-full rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400 transition-all" style={{ height: `${Math.max(week.rate, 6)}%` }} />
              </div>
              <div className="text-[9px] font-bold text-foreground">{week.rate}%</div>
              <div className="truncate text-[8px] text-muted-foreground">{week.weekLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
