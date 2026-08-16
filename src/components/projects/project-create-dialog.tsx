"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useAppTransition } from "@/lib/transition-provider";

export function ProjectCreateDialog({
  clients,
  clientId,
  isAtLimit = false,
  projectCount = 0,
  projectLimit = 5,
}: {
  clients: Array<{ id: string; name: string }>;
  clientId?: string;
  isAtLimit?: boolean;
  projectCount?: number;
  projectLimit?: number;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    refresh();
  }

  if (isAtLimit) {
    return (
      <Button size="sm" className="gap-1 w-full sm:w-auto" asChild>
        <Link href="/app/billing">
          <Plus className="h-4 w-4" />
          {t("Upgrade dulu", "Upgrade first")}
        </Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {clientId
            ? t("Tambah Proyek", "Add Project")
            : t("Proyek Baru", "New Project")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("Proyek Baru", "New Project")}</DialogTitle>
        </DialogHeader>
        <ProjectForm
          mode="create"
          clientId={clientId}
          clients={clients}
          onSuccess={handleSuccess}
        />
        {projectLimit > 0 && projectCount > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {t(
              `${projectCount}/${projectLimit} proyek di free plan`,
              `${projectCount}/${projectLimit} projects on free plan`,
            )}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
