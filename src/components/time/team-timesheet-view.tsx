"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/lib/i18n-client";
import {
  buildTodayTimeline,
  buildWeekDays,
  getEffectiveMinutes,
  type TeamTimeEntry,
} from "@/lib/team-timesheet";

function duration(minutes: number, h: string, m: string) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}${h} ${rest}${m}` : `${rest}${m}`;
}

export function TeamTimesheetView({ entries }: { entries: TeamTimeEntry[] }) {
  const { t, locale } = useT();
  const [mode, setMode] = useState<"today" | "week">("today");
  const [weekOffset, setWeekOffset] = useState(0);
  // selectedDate resets to today through cubiqlo:time-entry-started event owner when daily filter exists.
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => buildTodayTimeline(entries, now), [entries, now]);
  const week = useMemo(() => buildWeekDays(entries, now, weekOffset), [entries, now, weekOffset]);
  const todayMinutes = today.reduce((sum, entry) => sum + getEffectiveMinutes(entry, now), 0);
  const weekMinutes = week.reduce((sum, day) => sum + day.totalMinutes, 0);
  const h = t("j", "h");
  const m = t("mnt", "m");

  const entryRow = (entry: TeamTimeEntry) => {
    const active = !entry.endTime && entry.manualMinutes == null;
    return (
      <div key={entry.id} className="min-w-0 rounded-md border bg-background p-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{entry.description || entry.taskTitle || t("Tanpa deskripsi", "No description")}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {[entry.clientName, entry.projectName, entry.activityName].filter(Boolean).join(" · ") || t("Tanpa project", "No project")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold">{duration(getEffectiveMinutes(entry, now), h, m)}</p>
            {active && (
              <Badge variant="secondary" className="mt-1 gap-1 text-[9px]">
                {entry.pausedAt ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                {entry.pausedAt ? t("Jeda", "Paused") : t("Berjalan", "Running")}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3 p-4 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("Timesheet Tim", "Team Timesheet")}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{t("Ringkasan harian dan mingguan", "Daily and weekly overview")}</p>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-1 text-sm text-muted-foreground">
            <button type="button" className={`rounded-md px-3 py-1.5 font-medium ${mode === "today" ? "bg-background text-foreground shadow" : "hover:text-foreground"}`} onClick={() => setMode("today")} aria-label={t("Hari ini", "Today")}>{t("Harian", "Daily")}</button>
            <button type="button" className={`rounded-md px-3 py-1.5 font-medium ${mode === "week" ? "bg-background text-foreground shadow" : "hover:text-foreground"}`} onClick={() => setMode("week")}>{t("Mingguan", "Weekly")}</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {mode === "today" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{today.length} {t("entri", "entries")}</span>
              <strong className="text-sm">{duration(todayMinutes, h, m)}</strong>
            </div>
            {today.length ? <div className="space-y-2">{today.map(entryRow)}</div> : <EmptyState icon={Clock3} title={t("Belum ada waktu hari ini", "No time logged today")} description={t("Mulai timer atau tambah entri manual.", "Start a timer or add a manual entry.")} />}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center rounded-lg border bg-background text-sm shadow-sm">
                <button type="button" className="px-3 py-2" aria-label={t("Minggu sebelumnya", "Previous week")} onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></button>
                <span className="border-x px-3 py-2 font-medium">{week[0].date.toLocaleDateString(locale, { day: "numeric", month: "short" })} – {week[6].date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                <button type="button" className="px-3 py-2" aria-label={t("Minggu berikutnya", "Next week")} onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight className="h-4 w-4" /></button>
                <button type="button" className="border-l px-3 py-2 font-medium" onClick={() => setWeekOffset(0)}>{t("Minggu ini", "This week")}</button>
              </div>
              <p className="text-sm font-semibold">{duration(weekMinutes, h, m)}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
              {week.map((day) => (
                <div key={day.date.toISOString()} className="min-w-0 rounded-lg border bg-muted/20 p-2">
                  <div className="mb-2 flex items-center justify-between lg:block">
                    <p className="text-xs font-semibold">{day.date.toLocaleDateString(locale, { weekday: "short" })}</p>
                    <p className="text-[11px] text-muted-foreground">{day.date.toLocaleDateString(locale, { day: "numeric", month: "short" })} · {duration(day.totalMinutes, h, m)}</p>
                  </div>
                  <div className="space-y-1.5">{day.entries.length ? day.entries.map(entryRow) : <p className="py-2 text-center text-[11px] text-muted-foreground">—</p>}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
