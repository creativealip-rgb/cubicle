"use client";

import { useState } from "react";
import { groupTasksByWeek, TaskMinimal, getMondayOfCurrentWeek } from "@/lib/task-weekly-utils";
import { MiniDonut } from "./mini-donut";
import { InteractiveTaskItem } from "./interactive-task-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, ListTodo, Clock, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

interface TasksWeeklyTrackerProps {
  tasks: TaskMinimal[];
  initialWeekStart?: string;
}

export function TasksWeeklyTracker({ tasks: initialTasks, initialWeekStart }: TasksWeeklyTrackerProps) {
  const { t } = useT();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    initialWeekStart || getMondayOfCurrentWeek()
  );
  const [tasks, setTasks] = useState<TaskMinimal[]>(initialTasks);

  function handleTaskStatusChange(id: string, newStatus: "todo" | "done") {
    setTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  }

  function shiftWeek(days: number) {
    const [y, m, d] = currentWeekStart.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, "0");
    const nd = String(date.getDate()).padStart(2, "0");
    setCurrentWeekStart(`${ny}-${nm}-${nd}`);
  }

  const { days, otherTasks, stats } = groupTasksByWeek(currentWeekStart, tasks);

  // Format week range label (e.g. 31 Aug - 06 Sep 2026)
  const firstDay = days[0]?.shortDate || "";
  const lastDay = days[6]?.shortDate || "";

  return (
    <div className="space-y-6">
      {/* 1. Header KPI Summary & Navigation */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Overall Completion Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:col-span-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Penyelesaian Mingguan", "Weekly Completion")}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {stats.completed}/{stats.total}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {t("tugas selesai", "tasks completed")}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {stats.completed} {t("Selesai", "Done")}
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Clock className="h-3 w-3" /> {stats.inProgress + stats.todo} {t("Tertunda", "Pending")}
              </span>
            </div>
          </div>

          <div className="shrink-0 pl-4">
            <MiniDonut percentage={stats.percentage} size={64} strokeWidth={6} />
          </div>
        </div>

        {/* Daily Breakdown Bar Mini-Chart */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Aktivitas Harian", "Daily Breakdown")}
            </span>
            <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> 7 {t("Hari", "Days")}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-3 items-end h-16">
            {days.map((d) => (
              <div key={d.dateStr} className="flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full bg-muted/40 rounded-t-md relative flex items-end h-10 overflow-hidden">
                  <div
                    className={cn(
                      "w-full transition-all duration-500 rounded-t-md",
                      d.percentage === 100
                        ? "bg-emerald-500"
                        : d.percentage > 0
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    )}
                    style={{ height: `${Math.max(d.totalCount > 0 ? (d.completedCount / d.totalCount) * 100 : 8, 8)}%` }}
                  />
                </div>
                <span className={cn("text-[10px] font-medium", d.isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                  {d.dayName.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Week Navigator Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:col-span-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Rentang Minggu", "Week Range")}
          </span>

          <div className="flex items-center justify-between gap-1 py-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0"
              onClick={() => shiftWeek(-7)}
              title={t("Minggu sebelumnya", "Previous week")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center font-semibold text-xs text-foreground font-mono">
              {firstDay} - {lastDay}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0"
              onClick={() => shiftWeek(7)}
              title={t("Minggu berikutnya", "Next week")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Input
              type="date"
              value={currentWeekStart}
              onChange={(e) => e.target.value && setCurrentWeekStart(e.target.value)}
              className="h-7 text-xs rounded-lg font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setCurrentWeekStart(getMondayOfCurrentWeek())}
            >
              {t("Hari ini", "Today")}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 7-Day Columns Interactive Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 items-start">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "rounded-2xl border bg-card shadow-2xs overflow-hidden flex flex-col min-h-[360px] transition-all",
              day.isToday ? "border-primary/60 ring-1 ring-primary/30" : "border-border/80"
            )}
          >
            {/* Day Header */}
            <div
              className={cn(
                "p-3 border-b border-border/80 flex items-center justify-between",
                day.isToday ? "bg-primary/5" : "bg-muted/30"
              )}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-bold", day.isToday ? "text-primary" : "text-foreground")}>
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                      {t("Hari ini", "Today")}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{day.shortDate}</span>
              </div>

              <MiniDonut percentage={day.percentage} size={36} strokeWidth={3.5} />
            </div>

            {/* Task Items List */}
            <div className="p-2.5 flex-1 space-y-2 overflow-y-auto max-h-[380px]">
              {day.tasks.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-muted-foreground/60">
                  <ListTodo className="mx-auto mb-1 h-5 w-5 opacity-40" />
                  <span>{t("Tidak ada tugas", "No tasks")}</span>
                </div>
              ) : (
                day.tasks.map((task) => (
                  <InteractiveTaskItem
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    status={task.status}
                    priority={task.priority}
                    projectName={task.projectName}
                    clientName={task.clientName}
                    onStatusChange={handleTaskStatusChange}
                  />
                ))
              )}
            </div>

            {/* Day Footer Summary */}
            <div className="p-2.5 border-t border-border/60 bg-muted/20 text-center text-[10px] text-muted-foreground font-medium flex items-center justify-between">
              <span>{day.completedCount} / {day.totalCount} {t("Selesai", "Done")}</span>
              <span className="font-semibold text-foreground">{day.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Undated / Backlog Tasks Section */}
      {otherTasks.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">
                {t("Tugas Tanpa Tanggal / Diluar Minggu Ini", "Undated / Other Tasks")}
              </h3>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {otherTasks.length} {t("Tugas", "Tasks")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {otherTasks.map((task) => (
              <InteractiveTaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                status={task.status}
                priority={task.priority}
                projectName={task.projectName}
                clientName={task.clientName}
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
