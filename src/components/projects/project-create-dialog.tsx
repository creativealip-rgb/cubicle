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
import { ProjectForm } from "@/components/forms/project-form";

export function ProjectCreateDialog({ clients }: { clients: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Project Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Baru</DialogTitle>
        </DialogHeader>
        <ProjectForm mode="create" clients={clients} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
