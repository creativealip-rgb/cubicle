"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TasksListTable, type TasksListItem } from "@/components/tasks/tasks-list-table";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";

type Member = { id: string; name: string | null; email: string | null };

export function WorkflowTaskWorkspace({ tasks, members, projects, currentUserId, addTask }: {
  tasks: TasksListItem[];
  members: Member[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
  addTask?: ReactNode;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>List</Button>
        <Button size="sm" variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>Board</Button>
        {addTask}
      </div>
      {view === "list" ? (
        <TasksListTable tasks={tasks} members={members} projects={projects} currentUserId={currentUserId} currentFilters={{}} />
      ) : (
        <TasksBoardView tasks={tasks.map((task) => ({ ...task, projectId: task.projectId ?? undefined }))} members={members} />
      )}
    </div>
  );
}
