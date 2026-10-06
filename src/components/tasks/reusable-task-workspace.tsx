"use client";

import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/lib/i18n-client";
import {
  Clock,
  CheckSquare2,
  Folder,
  Play,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetTaskSubtasks } from "@/lib/actions/tasks";
import { startTimer } from "@/lib/actions/time";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";

export type ReusableTaskRow = {
  id: string;
  projectId?: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  assigneeName?: string | null;
  monthMinutes?: number;
  lastUsedAt?: string | null;
  lifecycle: "active" | "archived";
  subtaskTotal?: number;
  subtaskDone?: number;
};

type Member = { id: string; name: string | null; email: string | null };
type Project = { id: string; name: string };

function getInitials(name?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return "UN";
}

function getCadenceBadge(title: string, t: (id: string, en: string) => string) {
  const lower = title.toLowerCase();
  if (lower.includes("daily") || lower.includes("harian") || lower.includes("tiap hari") || lower.includes("standup")) {
    return {
      label: t("Harian", "Daily"),
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (lower.includes("weekly") || lower.includes("mingguan") || lower.includes("tiap minggu") || lower.includes("sprint")) {
    return {
      label: t("Mingguan", "Weekly"),
      className: "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (lower.includes("monthly") || lower.includes("bulanan") || lower.includes("tiap bulan") || lower.includes("rekap")) {
    return {
      label: t("Bulanan", "Monthly"),
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  return {
    label: t("Rutin / SOP", "Recurring SOP"),
    className: "bg-muted text-muted-foreground border-border/80",
  };
}

function formatTaskDuration(minutes: number, t: (id: string, en: string) => string): string {
  if (!minutes || minutes <= 0) return `0 ${t("jam", "hr")}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  const hLabel = t("j", "h");
  const mLabel = t("m", "m");

  if (hours === 0) {
    return `${remainingMins}${mLabel}`;
  }
  if (remainingMins === 0) {
    return `${hours} ${t("jam", "hr")}`;
  }
  return `${hours}${hLabel} ${remainingMins}${mLabel}`;
}

export function ReusableTaskWorkspace({
  tasks,
  members = [],
  projects = [],
  workspaceId,
  onMove,
  addTask,
}: {
  tasks: ReusableTaskRow[];
  members?: Member[];
  projects?: Project[];
  workspaceId?: string;
  onMove?: (id: string, direction: "up" | "down") => void;
  addTask?: React.ReactNode;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();

  const handleStartTimer = async (task: ReusableTaskRow, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!task.projectId) {
      toast.error(t("Pilih project terlebih dahulu", "Select a project first"));
      return;
    }
    if (!workspaceId) {
      window.location.href = `/app/time?startProject=${task.projectId}&startTask=${task.id}`;
      return;
    }
    try {
      await startTimer({
        workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        description: task.title,
      });
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dimulai!", "Timer started!"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mulai timer", "Failed to start timer"));
    }
  };

  const handleResetChecklist = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await resetTaskSubtasks(taskId);
      toast.success(t("Checklist SOP berhasil di-reset!", "SOP checklist reset successfully!"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal reset checklist", "Failed to reset checklist"));
    }
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title={t("Tidak ada tugas rutin", "No recurring tasks found")}
        description={t(
          "Tugas rutin (SOP / Aktivitas Berulang / Hourly) untuk tracking waktu dan checklist terstruktur akan muncul di sini.",
          "Recurring tasks (SOP / Repeating Activities / Hourly) for time tracking and structured checklists will appear here."
        )}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_13rem_7rem_7rem_8rem_7rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{t("Tugas Rutin / SOP", "Recurring Task / SOP")}</span>
        <span>{t("Proyek & Klien", "Project & Client")}</span>
        <span>{t("Petugas", "Assignee")}</span>
        <span>{t("Durasi Bulan Ini", "Time / Mo")}</span>
        <span>{t("Terakhir Dipakai", "Last Used")}</span>
        <span className="text-right">{t("Aksi", "Action")}</span>
      </div>

      {/* Flat Task Rows */}
      <div className="divide-y divide-border/60">
        {tasks.map((task) => {
          const fullTask = {
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            status: "todo",
            priority: "medium",
            assigneeId: task.assigneeId ?? "",
            assigneeName: task.assigneeName ?? "",
            dueDate: "",
            position: 0,
            clientVisible: true,
            projectId: task.projectId,
            projectName: task.projectName,
            mode: "reusable" as const,
            behavior: "recurring" as const,
            lifecycle: task.lifecycle,
          };

          const durationDisplay = formatTaskDuration(task.monthMinutes ?? 0, t);
          const cadence = getCadenceBadge(task.title, t);

          return (
            <TaskDetailSheet
              key={task.id}
              task={fullTask}
              members={members}
              projects={projects}
              className="block"
            >
              <div
                className="group flex flex-col sm:grid sm:grid-cols-[1fr_13rem_7rem_7rem_8rem_7rem] sm:items-center gap-2.5 sm:gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                {/* 1. Title & Cadence & SOP Subtask Checklist */}
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs shadow-2xs">
                    <Repeat className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </span>

                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${cadence.className}`}>
                      {cadence.label}
                    </span>

                    {(task.subtaskTotal ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            task.subtaskDone === task.subtaskTotal
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border/80"
                          }`}
                        >
                          <CheckSquare2 className="h-3 w-3" />
                          SOP: {task.subtaskDone}/{task.subtaskTotal}
                        </span>
                        <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden border border-border/40">
                          <div
                            className={`h-full transition-all ${
                              task.subtaskDone === task.subtaskTotal ? "bg-emerald-500" : "bg-primary"
                            }`}
                            style={{
                              width: `${Math.round(((task.subtaskDone ?? 0) / (task.subtaskTotal || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Project & Client */}
                <div className="min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {task.projectName ? (
                    <div className="inline-flex items-center gap-1 max-w-full truncate rounded-lg bg-muted/60 px-2 py-0.5 border border-border/60 text-[11px]">
                      <Folder className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="font-semibold text-foreground truncate">{task.projectName}</span>
                      {task.clientName && (
                        <>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="truncate text-muted-foreground">{task.clientName}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-[11px]">—</span>
                  )}
                </div>

                {/* 3. Assignee */}
                <div className="flex items-center gap-1.5 min-w-0 text-xs">
                  {task.assigneeName ? (
                    <div className="flex items-center gap-1.5 truncate" title={task.assigneeName}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {getInitials(task.assigneeName)}
                      </span>
                      <span className="truncate text-foreground text-xs font-medium">{task.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </div>

                {/* 4. Duration this month (Smart Formatting: 15m, 1h 30m, etc.) */}
                <div className="text-xs font-mono font-bold text-foreground">
                  {durationDisplay}
                </div>

                {/* 5. Last Used */}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>
                    {task.lastUsedAt
                      ? new Date(task.lastUsedAt).toLocaleDateString("id-ID", { month: "short", day: "numeric" })
                      : t("Belum pernah", "Never")}
                  </span>
                </div>

                {/* 6. Quick Action (Start Timer & Reset Checklist) */}
                <div className="flex items-center justify-end gap-1.5">
                  {(task.subtaskTotal ?? 0) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleResetChecklist(task.id, e)}
                      title={t("Reset Checklist SOP", "Reset SOP Checklist")}
                      className="h-7.5 w-7.5 rounded-lg p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {task.projectId && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => handleStartTimer(task, e)}
                      title={t("Mulai Timer", "Start Timer")}
                      className="h-7.5 w-7.5 rounded-lg p-0 bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  )}
                </div>
              </div>
            </TaskDetailSheet>
          );
        })}
      </div>
    </div>
  );
}
