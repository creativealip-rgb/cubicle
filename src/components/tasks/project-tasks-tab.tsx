"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export function ProjectTasksTab({ projectId, tasks, members = [] }: ProjectTasksTabProps) {
  const { t, lang, locale } = useT();
  const [view, setView] = useState<"board" | "list">("board");

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
              <div className="min-w-0 flex-1">{t("Judul", "Title")}</div>
              <div className="w-28">{t("Ditugaskan", "Assignee")}</div>
              <div className="w-24">{t("Jatuh Tempo", "Due")}</div>
              <div className="w-20">{t("Prioritas", "Priority")}</div>
              <div className="w-24">{t("Status", "Status")}</div>
            </div>
          )}
          {tasks.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("Belum ada tugas di proyek ini", "No tasks in this project yet")}
            </div>
          )}
          {tasks.map((task) => {
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
