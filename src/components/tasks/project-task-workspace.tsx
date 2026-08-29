"use client";

import { useMemo, useState } from "react";
import { TaskForm } from "@/components/forms/task-form";
import { WorkflowTaskWorkspace } from "@/components/tasks/workflow-task-workspace";
import { ReusableTaskWorkspace, type ReusableTaskRow } from "@/components/tasks/reusable-task-workspace";
import type { TasksListItem } from "@/components/tasks/tasks-list-table";
import { archiveTask, reorderProjectTasks, restoreTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";

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
  const [createOpen, setCreateOpen] = useState(false);
  const { t } = useT();
  const visibleWorkflow = useMemo(() => projectId ? workflowTasks : workflowTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [workflowTasks, projectId, page]);
  const visibleReusable = useMemo(() => projectId ? reusableTasks : reusableTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [reusableTasks, projectId, page]);
  async function moveReusable(id: string, direction: "up" | "down") {
    if (!projectId) return;
    const orderedTaskIds = reusableTasks.map((task) => task.id);
    const index = orderedTaskIds.indexOf(id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= orderedTaskIds.length) return;
    [orderedTaskIds[index], orderedTaskIds[target]] = [orderedTaskIds[target], orderedTaskIds[index]];
    await reorderProjectTasks(projectId, "reusable", orderedTaskIds);
    window.location.reload();
  }
  const titleText = mode === "reusable" ? t("Tugas Berulang", "Recurring Tasks") : t("Tugas Workflow", "Workflow Tasks");
  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> {t("Buat Tugas", "Create Task")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader><DialogTitle>{t("Buat Tugas", "Create Task")}</DialogTitle></DialogHeader>
        <TaskForm mode="create" projectId={projectId} members={members} projects={projects} taskMode={mode} onSuccess={() => setCreateOpen(false)} />
      </DialogContent>
    </Dialog>
  );
  return (
    <section className="space-y-4">
      <div className="-mt-16 mb-8 flex justify-end">{createButton}</div>
      {mode === "workflow" && <WorkflowTaskWorkspace title={titleText} tasks={visibleWorkflow} members={members} projects={projects} currentUserId={currentUserId} />}
      {mode === "reusable" && <ReusableTaskWorkspace tasks={visibleReusable} members={members} projects={projects} onMove={projectId ? moveReusable : undefined} />}
      {!projectId && Math.max(workflowTasks.length, reusableTasks.length) > PAGE_SIZE ? (
        <div className="flex justify-end gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t("Sebelumnya", "Previous")}</button>
          <button disabled={page * PAGE_SIZE >= Math.max(workflowTasks.length, reusableTasks.length)} onClick={() => setPage((value) => value + 1)}>{t("Berikutnya", "Next")}</button>
        </div>
      ) : null}
      <span className="hidden">{String(archiveTask)}{String(restoreTask)}</span>
    </section>
  );
}
