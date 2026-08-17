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
      <DialogContent className="flex max-h-[min(90dvh,800px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("Proyek Baru", "New Project")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <ProjectForm
            mode="create"
            clientId={clientId}
            clients={clients}
            onSuccess={handleSuccess}
          />
        </div>
        {projectLimit > 0 && projectCount > 0 ? (
          <div className="border-t px-6 py-3 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              {t(
                `${projectCount}/${projectLimit} proyek di free plan`,
                `${projectCount}/${projectLimit} projects on free plan`,
              )}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
