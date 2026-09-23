"use client";

import { useState } from "react";
import { updateTask } from "@/lib/actions/tasks";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/lib/i18n-client";
import {
  taskPriorityColor,
  taskPriorityLabel,
} from "@/lib/status-badge";
import {
  Clock,
  CheckSquare2,
  Folder,
} from "lucide-react";

export type TasksListItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  position: number;
  clientVisible: boolean;
  projectId: string | null;
  projectName: string | null;
  timeTrackingMode: "off" | "internal" | "billable" | null;
  clientName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  sourceNoteId?: string | null;
  behavior: "one_time" | "recurring" | null;
  mode?: "workflow" | "reusable";
  templateName?: string | null;
  subtaskTotal?: number;
  subtaskDone?: number;
};

type Member = { id: string; name: string | null; email: string | null };
type Project = { id: string; name: string };

function dueDays(dueDate: string | null) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function dueTone(task: TasksListItem) {
  if (task.status === "done") return "text-muted-foreground";
  const days = dueDays(task.dueDate);
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-red-600 font-semibold";
  if (days === 0) return "text-amber-700 font-semibold";
  if (days <= 7) return "text-amber-700 font-medium";
  return "text-muted-foreground";
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "UN";
}

interface TasksListTableProps {
  tasks: TasksListItem[];
  members: Member[];
  projects: Project[];
  currentUserId?: string;
  currentFilters?: {
    status?: string;
    priority?: string;
    projectId?: string;
    assignee?: string;
  };
  focusId?: string | null;
}

export function TasksListTable({
  tasks,
  members,
  projects,
  focusId,
}: TasksListTableProps) {
  const { t, lang } = useT();
  const [, startTransition] = useTransition();

  const handleFastToggle = (
    taskId: string,
    currentStatus: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = currentStatus === "done" ? "todo" : "done";

    startTransition(async () => {
      try {
        await updateTask(taskId, { status: newStatus });
        toast.success(
          newStatus === "done"
            ? t("Tugas selesai!", "Task completed!")
            : t("Tugas dibuka kembali", "Task reopened")
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("Gagal memperbarui status", "Failed to update status")
        );
      }
    });
  };

  const formatDueDate = (task: TasksListItem) => {
    if (!task.dueDate) return null;
    const dateStr = new Date(task.dueDate).toLocaleDateString(
      lang === "id" ? "id-ID" : "en-US",
      { month: "short", day: "numeric" }
    );
    if (task.status === "done") {
      return dateStr;
    }
    const days = dueDays(task.dueDate);
    if (days === null) return dateStr;
    if (days < 0) return `${dateStr} (${Math.abs(days)}h ${t("terlambat", "late")})`;
    if (days === 0) return `${dateStr} (${t("hari ini", "today")})`;
    return dateStr;
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare2}
        title={t("Tidak ada tugas ditemukan", "No tasks found")}
        description={t(
          "Coba sesuaikan kata kunci pencarian atau filter Anda.",
          "Try adjusting your search keyword or filters."
        )}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_13rem_7rem_6rem_8rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{t("Tugas", "Task")}</span>
        <span>{t("Proyek & Klien", "Project & Client")}</span>
        <span>{t("Petugas", "Assignee")}</span>
        <span>{t("Prioritas", "Priority")}</span>
        <span className="text-right">{t("Jatuh Tempo", "Due Date")}</span>
      </div>

      {/* Flat Task Rows */}
      <div className="divide-y divide-border/60">
        {tasks.map((task) => {
          const isFocus = focusId === task.id;

          return (
            <TaskDetailSheet
              key={task.id}
              task={{
                ...task,
                projectId: task.projectId ?? undefined,
              }}
              members={members}
              projects={projects}
              defaultOpen={isFocus}
              className="block"
            >
              <div
                id={isFocus ? `task-${task.id}` : undefined}
                className={`group flex flex-col sm:grid sm:grid-cols-[1fr_13rem_7rem_6rem_8rem] sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${
                  isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                }`}
              >
                {/* 1. Checkbox & Title & Subtasks */}
                <div className="min-w-0 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => handleFastToggle(task.id, task.status, e)}
                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      task.status === "done"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-input bg-background hover:border-primary text-transparent"
                    }`}
                    title={
                      task.status === "done"
                        ? t("Tandai belum selesai", "Mark as uncompleted")
                        : t("Tandai selesai", "Mark as completed")
                    }
                  >
                    <CheckSquare2 className="h-3 w-3" />
                  </button>

                  <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium transition-colors ${
                        task.status === "done"
                          ? "line-through text-muted-foreground"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.templateName && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-medium text-primary">
                        {task.templateName}
                      </span>
                    )}

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

                {/* 2. Project & Client Pill */}
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

                {/* 3. Assignee (Compact Avatar + Name) */}
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

                {/* 4. Priority */}
                <div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${taskPriorityColor(task.priority)}`}
                  >
                    {taskPriorityLabel(task.priority, lang)}
                  </Badge>
                </div>

                {/* 5. Due Date */}
                <div className="sm:text-right">
                  {task.dueDate ? (
                    <div className={`inline-flex items-center gap-1 text-xs ${dueTone(task)}`}>
                      <Clock className="h-3 w-3" />
                      <span>{formatDueDate(task)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
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
