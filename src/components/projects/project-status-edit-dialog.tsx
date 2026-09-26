"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { MoreHorizontal, Pencil, Copy, Archive, CheckCircle2, PlayCircle, PauseCircle, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { archiveProject, duplicateProject, updateProjectListStatus } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function ProjectStatusEditDialog({ projectId, projectName: _projectName, currentStatus }: { projectId: string; projectName: string; currentStatus: string }) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [busy, setBusy] = useState(false);

  async function handleSetStatus(newStatus: string) {
    if (newStatus === currentStatus) return;
    setBusy(true);
    try {
      await updateProjectListStatus(projectId, newStatus as any);
      toast.success(t("Status proyek diperbarui", "Project status updated"));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal memperbarui status", "Failed to update status"));
    } finally {
      setBusy(false);
    }
  }

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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => router.push(`/app/projects/${projectId}`)}>
          <Pencil className="size-3.5 mr-2" />
          {t("Ubah Proyek", "Edit Project")}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={busy}>
            <PlayCircle className="size-3.5 mr-2" />
            <span>{t("Ubah Status", "Change Status")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup value={currentStatus} onValueChange={(val) => void handleSetStatus(val)}>
              <DropdownMenuRadioItem value="active">{t("Active", "Active")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="in_progress">{t("In Progress", "In Progress")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="review">{t("In Review", "In Review")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="on_hold">{t("On Hold", "On Hold")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="completed">{t("Completed", "Completed")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

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
