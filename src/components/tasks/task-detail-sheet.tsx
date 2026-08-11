"use client";

import { useState } from "react";
import { TaskForm } from "@/components/forms/task-form";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useT } from "@/lib/i18n-client";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";

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
}

interface TaskDetailSheetProps {
  task: Task;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function TaskDetailSheet({
  task,
  members = [],
  children,
  defaultOpen = false,
}: TaskDetailSheetProps) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          {task.projectName && (
            <p className="text-sm text-muted-foreground">{task.projectName}</p>
          )}
        </SheetHeader>

        <div className="space-y-6">

          <div className="space-y-2">
            <Label className="text-xs">{t("Ubah tugas", "Edit task")}</Label>
            <TaskForm
              mode="edit"
              projectId={task.projectId}
              taskMode={task.mode ?? "workflow"}
              members={members}
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
              onSuccess={() => setOpen(false)}
            />
          </div>

          <Separator />

          <PermanentDeleteButton entityType="task" entityId={task.id} entityName={task.title} />


          {task.sourceNoteId ? (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> {t("Sumber catatan", "Source note")}
              </Label>
              <Button asChild variant="secondary" size="sm" className="gap-1 text-xs">
                <Link href={`/app/personal?tab=all&q=${encodeURIComponent(task.title)}`}>
                  {t("Buka di Catatan", "Open in Notes")}
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Task ini dibuat dari catatan pribadi.",
                  "This task was converted from a personal note.",
                )}
              </p>
            </div>
          ) : null}

          <Separator />

          {/* Comments placeholder */}
          <div className="space-y-2">
            <Label className="text-xs">{t("Komentar", "Comments")}</Label>
            <p className="text-xs text-muted-foreground">{t("Komentar segera hadir...", "Comments coming soon...")}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
