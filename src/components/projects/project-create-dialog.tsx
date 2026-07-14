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
import { useT } from "@/lib/i18n-client";

export function ProjectCreateDialog({ clients }: { clients: Array<{ id: string; name: string }> }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t("Proyek Baru", "New Project")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Proyek Baru", "New Project")}</DialogTitle>
        </DialogHeader>
        <ProjectForm mode="create" clients={clients} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
