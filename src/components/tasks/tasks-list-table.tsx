"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Filter, Clock, AlertTriangle } from "lucide-react";

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
  assigneeId: string | null;
  assigneeName: string | null;
  sourceNoteId?: string | null;
};

type Member = { id: string; name: string | null; email: string | null };

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
const STATUS_ORDER = ["todo", "in_progress", "review", "done", "cancelled"] as const;

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
  focusId = null,
}: {
  tasks: TasksListItem[];
  members: Member[];
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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="hidden items-center gap-4 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:flex">
        <div className="min-w-0 flex-1">
          <SortableHeader
            as="div"
            label={t("Judul", "Title")}
            dir={dirFor("title")}
            onClick={() => toggle("title")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
        <div className="w-32">
          <SortableHeader
            as="div"
            label={t("Proyek", "Project")}
            dir={dirFor("project")}
            onClick={() => toggle("project")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
        <div className="w-28">
          <SortableHeader
            as="div"
            label={t("Ditugaskan", "Assignee")}
            dir={dirFor("assignee")}
            onClick={() => toggle("assignee")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
        <div className="w-24">
          <SortableHeader
            as="div"
            label={t("Jatuh Tempo", "Due")}
            dir={dirFor("dueDate")}
            onClick={() => toggle("dueDate")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
        <div className="w-20">
          <SortableHeader
            as="div"
            label={t("Prioritas", "Priority")}
            dir={dirFor("priority")}
            onClick={() => toggle("priority")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
        <div className="w-24">
          <SortableHeader
            as="div"
            label={t("Status", "Status")}
            dir={dirFor("status")}
            onClick={() => toggle("status")}
            className="text-[11px] uppercase tracking-wide"
          />
        </div>
      </div>

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
            <Card
              id={isFocus ? `task-${task.id}` : undefined}
              className={`cursor-pointer rounded-none border-0 border-b shadow-none transition-colors last:border-b-0 hover:bg-muted/50 ${isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
            >
              <CardContent className="grid gap-3 p-4 md:flex md:items-center md:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  {task.sourceNoteId ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t("Dari catatan", "From note")}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground md:w-32 md:truncate">
                  {task.projectName ?? t("Tanpa proyek", "No project")}
                </div>
                <div className="text-xs text-muted-foreground md:w-28 md:truncate">
                  {task.assigneeName ?? t("Belum ditugaskan", "Unassigned")}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground md:w-24">
                  {task.dueDate ? (
                    <>
                      <Clock className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString(locale)}
                    </>
                  ) : (
                    t("Tanpa tenggat", "No due date")
                  )}
                </div>
                <div className="md:w-20">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${taskPriorityColor(task.priority)}`}
                  >
                    {task.priority === "urgent" && (
                      <AlertTriangle className="mr-0.5 h-3 w-3" />
                    )}
                    {taskPriorityLabel(task.priority, lang)}
                  </Badge>
                </div>
                <div className="md:w-24">
                  <Badge variant={sb.variant} className="text-[10px]">
                    {sb.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TaskDetailSheet>
        );
      })}
    </div>
  );
}
