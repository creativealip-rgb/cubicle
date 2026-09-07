"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TasksListTable, type TasksListItem } from "@/components/tasks/tasks-list-table";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";

type Member = { id: string; name: string | null; email: string | null };

export function WorkflowTaskWorkspace({ title, tasks, members, projects, currentUserId, addTask }: {
  title: string;
  tasks: TasksListItem[];
  members: Member[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
  addTask?: ReactNode;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-muted/40 p-0.5">
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>List</Button>
            <Button size="sm" variant={view === "board" ? "default" : "ghost"} onClick={() => setView("board")}>Board</Button>
          </div>
          {addTask}
        </div>
      </div>
      {view === "list" ? (
        <TasksListTable tasks={tasks} members={members} projects={projects} currentUserId={currentUserId} currentFilters={{}} />
      ) : (
        <TasksBoardView tasks={tasks.map((task) => ({ ...task, projectId: task.projectId ?? undefined }))} members={members} />
      )}
    </div>
  );
}
