"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { MoreHorizontal, Pencil, Copy, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { archiveProject, duplicateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function ProjectStatusEditDialog({ projectId, projectName: _projectName, currentStatus: _currentStatus }: { projectId: string; projectName: string; currentStatus: string }) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [busy, setBusy] = useState(false);

  async function handleDuplicate() {
    setBusy(true);
    try {
      const duplicated = await duplicateProject(projectId);
      toast.success(t("Proyek berhasil diduplikasi", "Project duplicated successfully"));
      refresh();
      if (duplicated?.id) {
        router.push(`/app/projects/${duplicated.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menduplikasi proyek", "Failed to duplicate project"));
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      await archiveProject(projectId);
      toast.success(t("Proyek diarsipkan", "Project archived"));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal mengarsipkan proyek", "Failed to archive project"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 rounded-md" aria-label={t("Aksi proyek", "Project actions")}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => router.push(`/app/projects/${projectId}`)}>
          <Pencil className="size-3.5 mr-2" />
          {t("Ubah Proyek", "Edit Project")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onSelect={() => void handleDuplicate()}>
          <Copy className="size-3.5 mr-2" />
          {t("Duplikat", "Duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} className="text-destructive focus:text-destructive" onSelect={() => void handleArchive()}>
          <Archive className="size-3.5 mr-2" />
          {t("Arsipkan", "Archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
