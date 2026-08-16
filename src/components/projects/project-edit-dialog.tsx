"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/forms/project-form";
import { useT } from "@/lib/i18n-client";
import { useAppTransition } from "@/lib/transition-provider";

type ProjectEditDialogProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    clientId: string;
    status: string;
    billingType: string;
    billingModel?: string | null;
    timeTrackingMode: string;
    activityRequired: boolean;
    currency: string;
    rate: string | null;
    budget: string | null;
    startDate: string | null;
    finishDate: string | null;
    dueDate: string | null;
    clientVisible: boolean;
    selectedPackageId: string | null;
    retainerFee: string | null;
    retainerIncludedMinutes: number | null;
    retainerResetDay: number | null;
    retainerOveragePolicy: "none" | "warn" | "bill" | null;
    retainerOverageRate: string | null;
  };
  activeProjectServiceIds: string[];
};

export function ProjectEditDialog({
  project,
  activeProjectServiceIds,
}: ProjectEditDialogProps) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil className="h-3 w-3" /> {t("Ubah", "Edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("Ubah Proyek", "Edit Project")}</DialogTitle>
        </DialogHeader>
        <ProjectForm
          mode="edit"
          clientId={project.clientId}
          clients={[]}
          defaultValues={{
            id: project.id,
            name: project.name,
            description: project.description ?? "",
            clientId: project.clientId,
            status: project.status,
            billingType: project.billingType,
            billingModel: (project.billingModel ?? undefined) as any,
            timeTrackingMode: project.timeTrackingMode,
            activityRequired: project.activityRequired,
            currency: project.currency,
            rate: project.rate ?? "",
            budget: project.budget ?? "",
            startDate: project.startDate ?? "",
            finishDate: project.finishDate ?? "",
            dueDate: project.dueDate ?? "",
            clientVisible: project.clientVisible,
            selectedPackageId: project.selectedPackageId,
            retainerFee: project.retainerFee ?? "",
            retainerIncludedMinutes: project.retainerIncludedMinutes ?? undefined,
            retainerResetDay: project.retainerResetDay ?? 1,
            retainerOveragePolicy: project.retainerOveragePolicy ?? "none",
            retainerOverageRate: project.retainerOverageRate ?? "",
            serviceIds: activeProjectServiceIds,
          }}
          onSuccess={() => {
            setOpen(false);
            refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
