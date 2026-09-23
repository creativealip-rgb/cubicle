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
      toast.success(t("Checklist SOP di-reset", "SOP checklist reset"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal reset checklist", "Failed to reset checklist"));
    }
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare2}
        title={t("Tidak ada tugas rutin", "No recurring tasks found")}
        description={t(
          "Tugas rutin (SOP / Retainer / Hourly) untuk tracking waktu dan checklist berulang akan muncul di sini.",
          "Recurring tasks (SOP / Retainer / Hourly) for time tracking and recurring checklists will appear here."
        )}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_13rem_7rem_7rem_8rem_6rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{t("Tugas Rutin / SOP", "Recurring Task / SOP")}</span>
        <span>{t("Proyek & Klien", "Project & Client")}</span>
        <span>{t("Petugas", "Assignee")}</span>
        <span>{t("Jam Bulan Ini", "Hours / Mo")}</span>
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

          const hours = ((task.monthMinutes ?? 0) / 60).toFixed(1);

          return (
            <TaskDetailSheet
              key={task.id}
              task={fullTask}
              members={members}
              projects={projects}
              className="block"
            >
              <div
                className="group flex flex-col sm:grid sm:grid-cols-[1fr_13rem_7rem_7rem_8rem_6rem] sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                {/* 1. Title & SOP Subtask Checklist */}
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 font-bold text-xs">
                    ∞
                  </div>

                  <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </span>

                    {(task.subtaskTotal ?? 0) > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          task.subtaskDone === task.subtaskTotal
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/60"
                            : "bg-muted text-muted-foreground border border-border/80"
                        }`}
                      >
                        <CheckSquare2 className="h-3 w-3" />
                        {task.subtaskDone}/{task.subtaskTotal}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Project & Client */}
                <div className="min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {task.projectName ? (
                    <div className="inline-flex items-center gap-1 max-w-full truncate rounded-md bg-muted/60 px-2 py-0.5 border border-border/50 text-[11px]">
                      <Folder className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="font-medium text-foreground truncate">{task.projectName}</span>
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
                      <span className="truncate text-muted-foreground text-xs">{task.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </div>

                {/* 4. Hours this month */}
                <div className="text-xs font-mono font-semibold text-foreground">
                  {hours} <span className="text-[11px] font-normal text-muted-foreground">{t("jam", "hr")}</span>
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
                <div className="flex items-center justify-end gap-1">
                  {(task.subtaskTotal ?? 0) > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleResetChecklist(task.id, e)}
                      title={t("Reset Checklist SOP", "Reset SOP Checklist")}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {task.projectId && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => handleStartTimer(task, e)}
                      title={t("Mulai Timer", "Start Timer")}
                      className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
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
