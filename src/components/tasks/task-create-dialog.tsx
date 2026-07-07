"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskForm } from "@/components/forms/task-form";

export function TaskCreateDialog({
  projectId,
  members,
  projects,
}: {
  projectId?: string;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Task Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Task Baru</DialogTitle>
        </DialogHeader>
        <TaskForm mode="create" projectId={projectId} members={members} projects={projects} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
