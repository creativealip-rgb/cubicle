import { HeatmapCell, WeeklyConsistency } from "@/lib/personal-productivity/visuals";
import { CalendarDays } from "lucide-react";

interface HabitHeatmapProps {
  cells: HeatmapCell[];
  weeklyTrends: WeeklyConsistency[];
  t: (id: string, en: string) => string;
  habitId?: string;
  toggleDateAction?: (formData: FormData) => Promise<void>;
}

const INTENSITY_COLORS = [
  "bg-muted/40 border border-border/40", // 0
  "bg-emerald-200 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800", // 1
  "bg-emerald-400 dark:bg-emerald-700", // 2
  "bg-emerald-500 dark:bg-emerald-600", // 3
  "bg-emerald-600 dark:bg-emerald-500", // 4
];

export function HabitHeatmap({ cells, weeklyTrends, t, habitId, toggleDateAction }: HabitHeatmapProps) {
  // Total checkins count
  const totalCheckins = cells.reduce((acc, c) => acc + c.completedCount, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-card p-3 space-y-3">
      {/* Header Compact */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-foreground">
            {t("Konsistensi Kebiasaan", "Habit Consistency")}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1.5">
            ({t("35 hari terakhir", "Last 35 days")})
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
          <CalendarDays className="size-3" />
          <span>{totalCheckins} {t("check-in", "check-ins")}</span>
        </div>
      </div>

      <div className="space-y-3 pt-0.5">
        {/* Full-width 35-day grid */}
        <div className="space-y-1.5">
          <div className="mx-auto grid max-w-md grid-cols-7 gap-1.5 sm:gap-2">
            {cells.map((cell) => {
              const label = `${new Date(`${cell.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${cell.completedCount}/${cell.totalScheduled} ${t("selesai", "completed")}`;
              const dot = <button type="submit" title={label} aria-label={label} disabled={!toggleDateAction || !habitId || cell.totalScheduled === 0} className={`mx-auto flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-white/90 transition sm:size-7 ${INTENSITY_COLORS[cell.intensity]} enabled:cursor-pointer enabled:hover:scale-110 enabled:hover:ring-2 enabled:hover:ring-emerald-400 enabled:hover:ring-offset-2 disabled:cursor-default`}>{cell.completedCount > 0 ? "✓" : ""}</button>;
              return toggleDateAction && habitId ? <form action={toggleDateAction} key={cell.date}><input type="hidden" name="habitId" value={habitId} /><input type="hidden" name="date" value={cell.date} />{dot}</form> : <div key={cell.date}>{dot}</div>;
            })}
          </div>

          <div className="mx-auto flex max-w-md items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
            <span>{cells[0]?.date ? new Date(`${cells[0].date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
            <div className="flex items-center gap-1">
              <span>{t("Sedikit", "Less")}</span>
              <div className="flex gap-0.5">
                <span className="size-2 rounded-[2px] bg-muted/60" />
                <span className="size-2 rounded-[2px] bg-emerald-200 dark:bg-emerald-950" />
                <span className="size-2 rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
                <span className="size-2 rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
              </div>
              <span>{t("Banyak", "More")}</span>
            </div>
            <span>{t("Hari ini", "Today")}</span>
          </div>
        </div>

        {/* Weekly Consistency Progress Bar mini chart */}
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>{t("Tren 5 Minggu", "Weekly Trend (5 Weeks)")}</span>
            <span>{t("Penyelesaian", "Rate")}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {weeklyTrends.map((week) => (
              <div key={week.startDate} className="space-y-1 text-center">
                <div className="relative h-9 w-full overflow-hidden rounded-md bg-muted/40 p-0.5 flex flex-col justify-end">
                  <div
                    className="w-full rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400 transition-all"
                    style={{ height: `${Math.max(week.rate, 6)}%` }}
                  />
                </div>
                <div className="text-[9px] font-bold text-foreground">
                  {week.rate}%
                </div>
                <div className="text-[8px] text-muted-foreground truncate">
                  {week.weekLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
