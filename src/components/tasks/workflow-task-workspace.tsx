"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TasksListTable, type TasksListItem } from "@/components/tasks/tasks-list-table";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";

import { TaskInlineQuickAdd } from "@/components/tasks/task-inline-quick-add";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";

type Member = { id: string; name: string | null; email: string | null };

export function WorkflowTaskWorkspace({ title, tasks, members, projects, currentUserId, addTask }: {
  title: string;
  tasks: TasksListItem[];
  members: Member[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
  addTask?: ReactNode;
}) {
  const [view, setView] = useState<"list" | "board">("board");
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-muted/40 p-0.5 shadow-2xs">
            <Button size="sm" variant={view === "board" ? "default" : "ghost"} className="h-7 px-2.5 text-xs font-medium" onClick={() => setView("board")}>Board</Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} className="h-7 px-2.5 text-xs font-medium" onClick={() => setView("list")}>List</Button>
          </div>
          {addTask || (
            <TaskCreateDialog
              projectId={projects[0]?.id}
              members={members}
              projects={projects}
              defaultTaskMode="workflow"
            />
          )}
        </div>
      </div>
      {view === "list" ? (
        <div className="space-y-3">
          {projects.length > 0 && (
            <TaskInlineQuickAdd
              projects={projects}
              status="todo"
              placeholder="+ Quick add task to this project..."
            />
          )}
          <TasksListTable tasks={tasks} members={members} projects={projects} currentUserId={currentUserId} currentFilters={{}} />
        </div>
      ) : (
        <TasksBoardView tasks={tasks.map((task) => ({ ...task, projectId: task.projectId ?? undefined }))} members={members} projects={projects} />
      )}
    </div>
  );
}
