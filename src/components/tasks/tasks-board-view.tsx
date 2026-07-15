"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { taskPriorityColor, taskPriorityLabel } from "@/lib/status-badge";
import { useT } from "@/lib/i18n-client";
import { Clock, AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  position: number;
  clientVisible: boolean;
  projectId?: string;
  projectName?: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  sourceNoteId?: string | null;
}

interface TasksBoardViewProps {
  tasks: Task[];
  members: Array<{ id: string; name: string | null; email: string | null }>;
}

export function TasksBoardView({ tasks, members }: TasksBoardViewProps) {
  const { t, lang, locale } = useT();

  const columns = [
    { id: "todo", label: t("Belum Mulai", "To Do"), color: "bg-slate-300" },
    { id: "in_progress", label: t("Dikerjakan", "In Progress"), color: "bg-blue-400" },
    { id: "review", label: t("Ditinjau", "Review"), color: "bg-amber-400" },
    { id: "done", label: t("Selesai", "Done"), color: "bg-emerald-400" },
  ];

  const grouped: Record<string, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
  for (const task of tasks) {
    const col = task.status in grouped ? task.status : "todo";
    grouped[col].push(task);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const colTasks = grouped[col.id];
        return (
          <div key={col.id} className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-3 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${col.color}`} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {colTasks.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {colTasks.map((task) => (
                <TaskDetailSheet key={task.id} task={task} members={members}>
                  <Card className="cursor-pointer border-border transition-shadow hover:shadow-md">
                    <CardContent className="space-y-2 p-3">
                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                      {task.projectName && (
                        <p className="truncate text-[11px] text-muted-foreground">{task.projectName}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${taskPriorityColor(task.priority)}`}>
                          {task.priority === "urgent" && <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />}
                          {taskPriorityLabel(task.priority, lang)}
                        </Badge>
                        {task.assigneeName && (
                          <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                            {task.assigneeName}
                          </span>
                        )}
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(locale)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TaskDetailSheet>
              ))}
              {colTasks.length === 0 && (
                <div className="rounded-lg border-2 border-dashed py-6 text-center text-xs text-muted-foreground">
                  {t("Tidak ada tugas", "No tasks")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
