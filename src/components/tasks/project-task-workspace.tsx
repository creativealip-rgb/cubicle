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
  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" /> {t("Tambah Tugas", "Add Task")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{t("Tambah Tugas", "Add Task")}</DialogTitle>
            </DialogHeader>
            <TaskForm mode="create" projectId={projectId} members={members} projects={projects} taskMode={mode} onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {visibleWorkflow.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold">Tugas Workflow</h3><WorkflowTaskWorkspace tasks={visibleWorkflow} members={members} projects={projects} currentUserId={currentUserId} /></div>}
      {visibleReusable.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold">Tugas Berulang</h3><ReusableTaskWorkspace tasks={visibleReusable} members={members} onMove={projectId ? moveReusable : undefined} /></div>}
      {visibleWorkflow.length === 0 && visibleReusable.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada tugas.</p>}
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
