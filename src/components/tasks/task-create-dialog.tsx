"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskForm } from "@/components/forms/task-form";
import { useT } from "@/lib/i18n-client";

export function TaskCreateDialog({
  projectId,
  members,
  projects,
}: {
  projectId?: string;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string; defaultBehavior?: "one_time" | "recurring" }>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> {t("Tugas Baru", "New Task")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,800px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t("Tugas Baru", "New Task")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <TaskForm
            mode="create"
            projectId={projectId}
            members={members}
            projects={projects}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
