import { HeatmapCell, WeeklyConsistency } from "@/lib/personal-productivity/visuals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface HabitHeatmapProps {
  cells: HeatmapCell[];
  weeklyTrends: WeeklyConsistency[];
  t: (id: string, en: string) => string;
}

const INTENSITY_COLORS = [
  "bg-muted/40 border border-border/40", // 0
  "bg-emerald-200 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800", // 1
  "bg-emerald-400 dark:bg-emerald-700", // 2
  "bg-emerald-500 dark:bg-emerald-600", // 3
  "bg-emerald-600 dark:bg-emerald-500", // 4
];

export function HabitHeatmap({ cells, weeklyTrends, t }: HabitHeatmapProps) {
  // Total checkins count
  const totalCheckins = cells.reduce((acc, c) => acc + c.completedCount, 0);

  return (
    <Card className="rounded-3xl border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            {t("Konsistensi Kebiasaan", "Habit Consistency")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("Aktivitas 35 hari terakhir", "Activity in the last 35 days")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <CalendarDays className="size-3.5" />
          <span>{totalCheckins} {t("check-in", "check-ins")}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* 35-Day Grid: 7 rows (days) x 5 cols (weeks) */}
        <div>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-1">
            {cells.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.completedCount}/${cell.totalScheduled} ${t("selesai", "completed")}`}
                className={`size-5 rounded-md transition-all sm:size-6 ${
                  INTENSITY_COLORS[cell.intensity]
                } flex items-center justify-center text-[9px] font-bold text-white/90`}
              >
                {cell.intensity === 4 ? "✓" : ""}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{cells[0]?.date ? new Date(`${cells[0].date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
            <div className="flex items-center gap-1">
              <span>{t("Sedikit", "Less")}</span>
              <div className="flex gap-1">
                <span className="size-2.5 rounded-sm bg-muted/60" />
                <span className="size-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-950" />
                <span className="size-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                <span className="size-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              </div>
              <span>{t("Banyak", "More")}</span>
            </div>
            <span>{t("Hari ini", "Today")}</span>
          </div>
        </div>

        {/* Weekly Consistency Progress Bar mini chart */}
        <div className="border-t pt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t("Tren Mingguan", "Weekly Trend (5 Weeks)")}</span>
            <span>{t("Tingkat Penyelesaian", "Completion Rate")}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weeklyTrends.map((week) => (
              <div key={week.startDate} className="space-y-1 text-center">
                <div className="relative h-16 w-full overflow-hidden rounded-xl bg-muted/40 p-1 flex flex-col justify-end">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all"
                    style={{ height: `${Math.max(week.rate, 6)}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-foreground">
                  {week.rate}%
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {week.weekLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
