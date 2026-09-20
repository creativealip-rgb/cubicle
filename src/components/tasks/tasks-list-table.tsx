"use client";

import { useState, useMemo } from "react";
import { updateTask } from "@/lib/actions/tasks";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/lib/i18n-client";
import {
  taskPriorityColor,
  taskStatusVariant,
  taskPriorityLabel,
} from "@/lib/status-badge";
import {
  Clock,
  CheckSquare2,
  ChevronDown,
  ChevronRight,
  Folder,
  Briefcase,
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
  const days = dueDays(task.dueDate);
  if (days === null) return "text-muted-foreground";
  if (days < 0) return task.status === "done" ? "text-green-700 font-medium" : "text-red-600 font-semibold";
  if (days === 0) return task.status === "done" ? "text-muted-foreground" : "text-amber-700 font-semibold";
  if (days <= 7) return "text-amber-700 font-medium";
  return "text-muted-foreground";
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

  // Collapsed state per Client and Project
  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const toggleClient = (clientKey: string) => {
    setCollapsedClients((prev) => ({ ...prev, [clientKey]: !prev[clientKey] }));
  };

  const toggleProject = (projectKey: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [projectKey]: !prev[projectKey] }));
  };

  const handleFastToggle = (
    taskId: string,
    currentStatus: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    startTransition(async () => {
      try {
        await updateTask(taskId, { status: nextStatus });
        toast.success(
          nextStatus === "done"
            ? t("Tugas selesai!", "Task completed!")
            : t("Tugas dibuka kembali", "Task reopened"),
        );
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : t("Gagal update status", "Failed to update status"),
        );
      }
    });
  };

  const formatDue = (task: TasksListItem) => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate);
    const formatted = d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
      day: "numeric",
      month: "short",
    });
    const days = dueDays(task.dueDate);
    if (days === null) return formatted;
    if (days < 0) return `${formatted} (${Math.abs(days)}h terlambat)`;
    if (days === 0) return `${formatted} (hari ini)`;
    if (days === 1) return `${formatted} (besok)`;
    return formatted;
  };

  // Grouping Hierarchy: Client -> Projects -> Tasks
  type ProjectGroup = {
    projectId: string | null;
    projectName: string;
    tasks: TasksListItem[];
  };

  type ClientGroup = {
    clientName: string;
    projects: ProjectGroup[];
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
  };

  const groupedData = useMemo(() => {
    const clientMap = new Map<string, Map<string, TasksListItem[]>>();

    for (const task of tasks) {
      const cName = task.clientName || (task.projectId ? t("Klien Lain", "Other Client") : t("Tanpa Klien / Internal", "No Client / Internal"));
      const pId = task.projectId || "__none__";

      if (!clientMap.has(cName)) {
        clientMap.set(cName, new Map());
      }
      const projectMap = clientMap.get(cName)!;
      if (!projectMap.has(pId)) {
        projectMap.set(pId, []);
      }
      projectMap.get(pId)!.push(task);
    }

    const result: ClientGroup[] = [];

    clientMap.forEach((projectMap, clientName) => {
      const projectGroups: ProjectGroup[] = [];
      let totalTasks = 0;
      let activeTasks = 0;
      let completedTasks = 0;

      projectMap.forEach((taskList, pId) => {
        const pName = pId === "__none__" ? t("Tanpa Proyek", "No Project") : (taskList[0]?.projectName || t("Proyek", "Project"));
        projectGroups.push({
          projectId: pId === "__none__" ? null : pId,
          projectName: pName,
          tasks: taskList,
        });

        totalTasks += taskList.length;
        activeTasks += taskList.filter((tk) => tk.status !== "done").length;
        completedTasks += taskList.filter((tk) => tk.status === "done").length;
      });

      result.push({
        clientName,
        projects: projectGroups,
        totalTasks,
        activeTasks,
        completedTasks,
      });
    });

    return result;
  }, [tasks, t]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={t("Belum ada tugas", "No tasks found")}
        description={t(
          "Buat tugas pertama Anda untuk mulai mengatur pekerjaan proyek.",
          "Create your first task to start organizing project work.",
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {groupedData.map((clientGroup) => {
        const isClientCollapsed = !!collapsedClients[clientGroup.clientName];

        return (
          <div
            key={clientGroup.clientName}
            className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all"
          >
            {/* Level 1: Client Header */}
            <div
              onClick={() => toggleClient(clientGroup.clientName)}
              className="flex cursor-pointer select-none items-center justify-between border-b bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isClientCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  {clientGroup.clientName}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-md bg-background px-2 py-0.5 font-medium text-foreground border shadow-xs">
                  {clientGroup.projects.length} {t("Proyek", "Projects")}
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  {clientGroup.activeTasks} {t("Aktif", "Active")}
                </span>
                {clientGroup.completedTasks > 0 && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600">
                    {clientGroup.completedTasks} {t("Selesai", "Done")}
                  </span>
                )}
              </div>
            </div>

            {/* Client Body (Projects List) */}
            {!isClientCollapsed && (
              <div className="divide-y divide-border/60">
                {clientGroup.projects.map((projectGroup) => {
                  const projectKey = `${clientGroup.clientName}-${projectGroup.projectName}`;
                  const isProjectCollapsed = !!collapsedProjects[projectKey];

                  return (
                    <div key={projectKey} className="bg-background">
                      {/* Level 2: Project Header */}
                      <div
                        onClick={() => toggleProject(projectKey)}
                        className="flex cursor-pointer select-none items-center justify-between bg-muted/15 px-4 py-2 hover:bg-muted/30 transition-colors pl-8"
                      >
                        <div className="flex items-center gap-2">
                          {isProjectCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">
                            {projectGroup.projectName}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {projectGroup.tasks.length} {t("tugas", "tasks")}
                        </span>
                      </div>

                      {/* Level 3: Tasks Rows */}
                      {!isProjectCollapsed && (
                        <div className="divide-y divide-border/40 pl-6 sm:pl-10">
                          {projectGroup.tasks.map((task) => {
                            const sb = taskStatusVariant(task.status, lang);
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
                                  className={`flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors ${
                                    isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                                  }`}
                                >
                                  {/* Checkbox & Title */}
                                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) => handleFastToggle(task.id, task.status, e)}
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                                        task.status === "done"
                                          ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                                          : "border border-input text-transparent hover:border-primary hover:text-primary/40"
                                      }`}
                                      title={
                                        task.status === "done"
                                          ? t("Tandai belum selesai", "Mark as uncompleted")
                                          : t("Tandai selesai", "Mark as completed")
                                      }
                                    >
                                      <CheckSquare2 className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`text-sm font-medium transition-colors ${
                                          task.status === "done"
                                            ? "line-through text-muted-foreground"
                                            : "text-foreground"
                                        }`}
                                      >
                                        {task.title}
                                      </span>
                                      {task.templateName && (
                                        <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-medium text-primary">
                                          {task.templateName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Meta: Assignee, Priority, Due Date, Status */}
                                  <div className="flex items-center gap-3 shrink-0 text-xs">
                                    {task.assigneeName ? (
                                      <span className="text-muted-foreground hidden sm:inline max-w-24 truncate">
                                        {task.assigneeName}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40 hidden sm:inline">—</span>
                                    )}

                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-medium ${taskPriorityColor(task.priority)}`}
                                    >
                                      {taskPriorityLabel(task.priority, lang)}
                                    </Badge>

                                    {task.dueDate && (
                                      <span
                                        className={`hidden md:flex items-center gap-1 text-[11px] ${dueTone(
                                          task,
                                        )}`}
                                      >
                                        <Clock className="h-3 w-3" />
                                        {formatDue(task)}
                                      </span>
                                    )}

                                    <Badge variant={sb.variant} className="text-[10px] font-medium">
                                      {sb.label}
                                    </Badge>
                                  </div>
                                </div>
                              </TaskDetailSheet>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
