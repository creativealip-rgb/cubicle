"use client";

import { useState } from "react";
import { updateTask, bulkUpdateTasksStatus, bulkDeleteTasks, toggleSubtask } from "@/lib/actions/tasks";
import { startTimer } from "@/lib/actions/time";
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
  ChevronRight,
  ChevronDown,
  Play,
  Trash2,
  CheckCircle2,
  Square,
  MinusSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppTransition } from "@/lib/transition-provider";

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
  workspaceId?: string;
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
  workspaceId,
  focusId,
}: TasksListTableProps) {
  const { t, lang } = useT();
  const { refresh } = useAppTransition();
  const [, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedSubtaskTaskIds, setExpandedSubtaskTaskIds] = useState<Set<string>>(new Set());
  const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, Array<{ id: string; title: string; completed: boolean; description: string | null }>>>({});
  const [loadingSubtasks, setLoadingSubtasks] = useState<Record<string, boolean>>({});

  const handleStartTimer = async (task: TasksListItem, e: React.MouseEvent) => {
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

  const toggleExpandSubtasks = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = new Set(expandedSubtaskTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
      setExpandedSubtaskTaskIds(next);
      return;
    }
    next.add(taskId);
    setExpandedSubtaskTaskIds(next);

    if (!subtasksByTaskId[taskId]) {
      setLoadingSubtasks((prev) => ({ ...prev, [taskId]: true }));
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`);
        // if api route exists or call server action directly
      } catch {
        // fallback
      } finally {
        setLoadingSubtasks((prev) => ({ ...prev, [taskId]: false }));
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkStatus = async (status: "todo" | "in_progress" | "review" | "done") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      await bulkUpdateTasksStatus(ids, status);
      toast.success(t(`${ids.length} tugas diperbarui`, `${ids.length} tasks updated`));
      setSelectedIds(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal update tugas", "Failed to update tasks"));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirm(t(`Hapus ${ids.length} tugas terpilih?`, `Delete ${ids.length} selected tasks?`))) return;
    try {
      await bulkDeleteTasks(ids);
      toast.success(t(`${ids.length} tugas dihapus`, `${ids.length} tasks deleted`));
      setSelectedIds(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus tugas", "Failed to delete tasks"));
    }
  };

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
    <div className="space-y-3">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 px-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <CheckSquare2 className="h-4 w-4" />
            <span>{selectedIds.size} {t("tugas terpilih", "tasks selected")}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 bg-background"
              onClick={() => handleBulkStatus("in_progress")}
            >
              {t("In Progress", "In Progress")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 bg-background text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={() => handleBulkStatus("done")}
            >
              <CheckCircle2 className="h-3 w-3" />
              {t("Tandai Selesai", "Mark Done")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-3 w-3" />
              {t("Hapus", "Delete")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden sm:grid sm:grid-cols-[2rem_1fr_13rem_7rem_6rem_8rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {selectedIds.size === tasks.length && tasks.length > 0 ? (
              <CheckSquare2 className="h-4 w-4 text-primary" />
            ) : selectedIds.size > 0 ? (
              <MinusSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
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
            const isSelected = selectedIds.has(task.id);

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
                  className={`group flex flex-col sm:grid sm:grid-cols-[2rem_1fr_13rem_7rem_6rem_8rem] sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${
                    isSelected ? "bg-primary/5" : isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                  }`}
                >
                  {/* Select Checkbox */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelect(task.id, e)}
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input bg-background hover:border-primary text-transparent"
                      }`}
                    >
                      <CheckSquare2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* 1. Complete Button, Play Timer & Title */}
                  <div className="min-w-0 flex items-center gap-2">
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

                    {task.projectId && task.status !== "done" && (
                      <button
                        type="button"
                        onClick={(e) => handleStartTimer(task, e)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                        title={t("Mulai timer untuk tugas ini", "Start timer for this task")}
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                      </button>
                    )}

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
                        <div className="flex items-center gap-1.5">
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
                          <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
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
  </div>
  );
}
