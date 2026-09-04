"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { EmptyState } from "@/components/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import {
  taskPriorityColor,
  taskStatusVariant,
  taskPriorityLabel,
} from "@/lib/status-badge";
import { Filter, Clock, AlertTriangle, CheckSquare2 } from "lucide-react";
import { TableHeaderFilter } from "@/components/ui/table-header-filter";

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
};

type Member = { id: string; name: string | null; email: string | null };

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
const STATUS_ORDER = ["todo", "in_progress", "review", "done", "cancelled"] as const;

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

type SortKey =
  | "title"
  | "project"
  | "assignee"
  | "dueDate"
  | "priority"
  | "status";

export function TasksListTable({
  tasks,
  members,
  projects,
  currentUserId,
  currentFilters,
  focusId = null,
}: {
  tasks: TasksListItem[];
  members: Member[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
  currentFilters: { status?: string; priority?: string; projectId?: string; assignee?: string };
  focusId?: string | null;
}) {
  const { t, lang, locale } = useT();

  const getters = useMemo(
    () => ({
      title: (r: TasksListItem) => r.title,
      project: (r: TasksListItem) => r.projectName ?? "",
      assignee: (r: TasksListItem) => r.assigneeName ?? "",
      dueDate: (r: TasksListItem) => r.dueDate,
      priority: (r: TasksListItem) => r.priority,
      status: (r: TasksListItem) => r.status,
    }),
    [],
  );

  const orders = useMemo(
    () => ({
      priority: PRIORITY_ORDER,
      status: STATUS_ORDER,
    }),
    [],
  );

  const { sorted, toggle, dirFor } = useTableSort<TasksListItem, SortKey>(
    tasks,
    getters,
    orders,
  );

  function formatDue(task: TasksListItem) {
    if (!task.dueDate) return t("Tanpa tenggat", "No due date");
    const base = new Date(task.dueDate).toLocaleDateString(locale, { month: "short", day: "numeric" });
    const days = dueDays(task.dueDate);
    if (days === null) return base;
    if (days < 0) return task.status === "done" ? `${base} · ${t("selesai", "done")}` : `${base} · ${t("lewat", "overdue")}`;
    if (days === 0) return `${base} · ${t("hari ini", "today")}`;
    if (days <= 7) return `${base} · ${days} ${t("hari", "days")}`;
    return base;
  }

  if (tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border bg-card">
        <EmptyState
          icon={Filter}
          title={t("Tidak ada tugas ditemukan", "No tasks found")}
          description={t(
            "Tidak ada tugas yang cocok dengan filter. Coba ubah filter atau buat tugas baru.",
            "No tasks match the filter. Try changing the filter or create a new task.",
          )}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
      <div className="hidden items-center gap-3 border-b border-border/80 bg-muted/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:flex">
        <div className="min-w-0 flex-1">
          <SortableHeader
            as="div"
            label={t("Judul", "Title")}
            dir={dirFor("title")}
            onClick={() => toggle("title")}
            className="text-[11px] uppercase tracking-wider"
          />
        </div>
        <div className="w-44">
          <TableHeaderFilter label={t("Proyek", "Project")} queryKey="projectId" value={currentFilters.projectId} basePath="/app/tasks" options={[{value:"all",label:t("Semua proyek","All projects")},...projects.map(p=>({value:p.id,label:p.name}))]} className="text-[11px] uppercase tracking-wider" />
        </div>
        <div className="w-28">
          <TableHeaderFilter label={t("Ditugaskan", "Assignee")} queryKey="assignee" value={currentFilters.assignee} basePath="/app/tasks" options={[{value:"all",label:t("Semua petugas","All assignees")},{value:"me",label:t("Saya","Me")},{value:"unassigned",label:t("Belum ditugaskan","Unassigned")},...members.filter(m=>m.id!==currentUserId).map(m=>({value:m.id,label:m.name||m.email||m.id.slice(0,8)}))]} className="text-[11px] uppercase tracking-wider" />
        </div>
        <div className="w-28">
          <SortableHeader
            as="div"
            label={t("Tenggat", "Due")}
            dir={dirFor("dueDate")}
            onClick={() => toggle("dueDate")}
            className="text-[11px] uppercase tracking-wider"
          />
        </div>
        <div className="w-24">
          <TableHeaderFilter label={t("Prioritas", "Priority")} queryKey="priority" value={currentFilters.priority} basePath="/app/tasks" options={[{value:"all",label:t("Semua prioritas","All priorities")},{value:"urgent",label:t("Mendesak","Urgent")},{value:"high",label:t("Tinggi","High")},{value:"medium",label:t("Sedang","Medium")},{value:"low",label:t("Rendah","Low")}]} className="text-[11px] uppercase tracking-wider" />
        </div>
        <div className="w-24">
          <TableHeaderFilter label={t("Status", "Status")} queryKey="status" value={currentFilters.status} basePath="/app/tasks" options={[{value:"all",label:t("Semua status","All statuses")},{value:"todo",label:t("Belum Mulai","To Do")},{value:"in_progress",label:t("Dikerjakan","In Progress")},{value:"review",label:"Review"},{value:"done",label:t("Selesai","Done")}]} className="text-[11px] uppercase tracking-wider" />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((task) => {
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
              defaultOpen={isFocus}
            >
              <div
                id={isFocus ? `task-${task.id}` : undefined}
                className={`cursor-pointer rounded-lg border bg-card p-4 space-y-2 transition-colors hover:bg-muted/50 ${isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1 min-w-0">{task.title}</p>
                  <Badge variant={sb.variant} className="text-[10px] shrink-0">{sb.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {task.projectName && <span>{task.projectName}</span>}
                  {task.assigneeName && <span>· {task.assigneeName}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${taskPriorityColor(task.priority)}`}>
                    {taskPriorityLabel(task.priority, lang)}
                  </Badge>
                  {task.dueDate && (
                    <span className={`text-xs flex items-center gap-1 ${dueTone(task)}`}>
                      <Clock className="h-3 w-3" />
                      {formatDue(task)}
                    </span>
                  )}
                </div>
              </div>
            </TaskDetailSheet>
          );
        })}
      </div>

      {/* Desktop rows */}
      <div className="hidden md:block">
        {sorted.map((task) => {
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
              defaultOpen={isFocus}
            >
              <div
                id={isFocus ? `task-${task.id}` : undefined}
                className={`cursor-pointer border-b border-border/60 px-3.5 py-2 transition-colors last:border-b-0 hover:bg-muted/40 ${isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${task.status === "done" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                      <CheckSquare2 className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors">{task.title}</p>
                        {task.mode === "reusable" ? (
                          <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">Reusable</span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">Workflow</span>
                        )}
                        {task.sourceNoteId && (
                          <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">
                            {t("Catatan", "Note")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground w-44 truncate">
                    <span>{task.projectName ?? t("Tanpa proyek", "No project")}</span>
                    {task.clientName ? <span className="text-[11px] opacity-75 block truncate">{task.clientName}</span> : null}
                  </div>
                  <div className="text-sm text-muted-foreground w-28 truncate">
                    {task.assigneeName ?? <span className="text-muted-foreground/60">—</span>}
                  </div>
                  <div className={`flex items-center gap-1 text-sm w-28 ${dueTone(task)}`}>
                    <Clock className="h-3 w-3" />
                    <span className="truncate">{formatDue(task)}</span>
                  </div>
                  <div className="w-24">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 rounded-full font-medium ${taskPriorityColor(task.priority)}`}>
                      {task.priority === "urgent" && <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />}
                      {taskPriorityLabel(task.priority, lang)}
                    </Badge>
                  </div>
                  <div className="w-24">
                    <Badge variant="outline" className={`gap-1 text-[10px] px-2 py-0 h-5 rounded-full font-medium ${sb.variant === "default" ? "border-primary/30 bg-primary/10 text-primary" : "border-border/80 bg-muted/60 text-muted-foreground"}`}>
                      <span className={`h-1 w-1 rounded-full ${task.status === "done" ? "bg-emerald-600" : task.status === "in_progress" ? "bg-blue-600" : "bg-muted-foreground"}`} />
                      {sb.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </TaskDetailSheet>
          );
        })}
      </div>
    </div>
  );
}
