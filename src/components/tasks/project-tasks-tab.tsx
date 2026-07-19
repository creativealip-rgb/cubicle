"use client";

import { useMemo, useState } from "react";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { taskStatusVariant, taskPriorityColor, taskPriorityLabel } from "@/lib/status-badge";
import { List, LayoutGrid, Clock, AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  position: number;
  clientVisible: boolean;
  projectId?: string;
  projectName?: string;
}

interface ProjectTasksTabProps {
  projectId: string;
  tasks: Task[];
  members?: Array<{ id: string; name: string | null; email: string | null }>;
}

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
const STATUS_ORDER = ["todo", "in_progress", "review", "done", "cancelled"] as const;

type SortKey = "title" | "assignee" | "dueDate" | "priority" | "status";

export function ProjectTasksTab({ projectId, tasks, members = [] }: ProjectTasksTabProps) {
  const { t, lang, locale } = useT();
  const [view, setView] = useState<"board" | "list">("board");

  const getters = useMemo(
    () => ({
      title: (r: Task) => r.title,
      assignee: (r: Task) => r.assigneeName ?? "",
      dueDate: (r: Task) => r.dueDate,
      priority: (r: Task) => r.priority,
      status: (r: Task) => r.status,
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

  const { sorted, toggle, dirFor } = useTableSort<Task, SortKey>(tasks, getters, orders);

  const base = "flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md transition-colors";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setView("board")}
            className={cn(base, view === "board" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {t("Papan", "Board")}
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(base, view === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-3.5 w-3.5" /> {t("Daftar", "List")}
          </button>
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard projectId={projectId} tasks={tasks} members={members} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {tasks.length > 0 && (
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
          )}
          {tasks.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("Belum ada tugas di proyek ini", "No tasks in this project yet")}
            </div>
          )}
          {sorted.map((task) => {
            const sb = taskStatusVariant(task.status, lang);
            return (
              <TaskDetailSheet key={task.id} task={task} members={members}>
                <Card className="cursor-pointer rounded-none border-0 border-b shadow-none transition-colors last:border-b-0 hover:bg-muted/50">
                  <CardContent className="grid gap-3 p-4 md:flex md:items-center md:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
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
                      <Badge variant="outline" className={`text-[10px] ${taskPriorityColor(task.priority)}`}>
                        {task.priority === "urgent" && <AlertTriangle className="mr-0.5 h-3 w-3" />}
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
      )}
    </div>
  );
}
