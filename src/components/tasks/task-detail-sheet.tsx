"use client";

import { useState } from "react";
import { TaskForm } from "@/components/forms/task-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

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
  projectName?: string | null;
  timeTrackingMode?: "off" | "internal" | "billable" | null;
  sourceNoteId?: string | null;
  mode?: "workflow" | "reusable";
  lifecycle?: "active" | "archived";
}

interface TaskDetailSheetProps {
  task: Task;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function TaskDetailSheet({
  task,
  members = [],
  projects = [],
  children,
  defaultOpen = false,
  className,
}: TaskDetailSheetProps & { className?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className={className ?? "cursor-pointer"}>
        {children}
      </div>
      <DialogContent className="flex max-h-[min(90dvh,800px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t("Edit Tugas", "Edit Task")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <TaskForm
            mode="edit"
            projectId={task.projectId}
            taskMode={task.mode ?? "workflow"}
            members={members}
            projects={projects}
            defaultValues={{
              id: task.id,
              title: task.title,
              description: task.description ?? "",
              status: task.status,
              priority: task.priority,
              assigneeId: task.assigneeId ?? "",
              dueDate: task.dueDate ?? "",
              clientVisible: task.clientVisible,
            }}
            lifecycle={task.lifecycle}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
