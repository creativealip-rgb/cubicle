"use client";

import { useMemo, useState } from "react";
import { TaskForm } from "@/components/forms/task-form";
import { WorkflowTaskWorkspace } from "@/components/tasks/workflow-task-workspace";
import { ReusableTaskWorkspace, type ReusableTaskRow } from "@/components/tasks/reusable-task-workspace";
import type { TasksListItem } from "@/components/tasks/tasks-list-table";
import { archiveTask, restoreTask } from "@/lib/actions/tasks";

export const PAGE_SIZE = 10;
type Member = { id: string; name: string | null; email: string | null };

export function ProjectTaskWorkspace({ projectId, mode, workflowTasks, reusableTasks, members, projects, currentUserId }: {
  projectId?: string;
  mode: "workflow" | "reusable";
  workflowTasks: TasksListItem[];
  reusableTasks: ReusableTaskRow[];
  members: Member[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
}) {
  const [page, setPage] = useState(1);
  const visibleWorkflow = useMemo(() => projectId ? workflowTasks : workflowTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [workflowTasks, projectId, page]);
  const visibleReusable = useMemo(() => projectId ? reusableTasks : reusableTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [reusableTasks, projectId, page]);
  return (
    <section className="space-y-4">
      <TaskForm mode="create" projectId={projectId} members={members} projects={projects} taskMode={mode} />
      {mode === "workflow" ? (
        <WorkflowTaskWorkspace tasks={visibleWorkflow} members={members} projects={projects} currentUserId={currentUserId} />
      ) : (
        <ReusableTaskWorkspace tasks={visibleReusable} />
      )}
      {!projectId && Math.max(workflowTasks.length, reusableTasks.length) > PAGE_SIZE ? (
        <div className="flex justify-end gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
          <button disabled={page * PAGE_SIZE >= Math.max(workflowTasks.length, reusableTasks.length)} onClick={() => setPage((value) => value + 1)}>Berikutnya</button>
        </div>
      ) : null}
      <span className="hidden">{String(archiveTask)}{String(restoreTask)}</span>
    </section>
  );
}
