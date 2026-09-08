"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";
import { archiveProject, updateProjectListStatus } from "@/lib/actions/projects";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";

export function ProjectHeaderActions({ project, activeProjectServiceIds, billingModelLocked }: any) {
  const { t } = useT(); const { refresh } = useAppTransition(); const editRef=useRef<HTMLButtonElement>(null); const deleteRef=useRef<HTMLButtonElement>(null); const [busy,setBusy]=useState(false);
  async function archive(){setBusy(true);try{await archiveProject(project.id);toast.success(t("Proyek diarsipkan","Project archived"));refresh()}catch(e){toast.error(e instanceof Error?e.message:t("Gagal mengarsipkan","Failed to archive"))}finally{setBusy(false)}}
  async function restore(){setBusy(true);try{await updateProjectListStatus(project.id, "active");toast.success(t("Proyek dipulihkan","Project restored"));refresh()}catch(e){toast.error(e instanceof Error?e.message:t("Gagal memulihkan","Failed to restore"))}finally{setBusy(false)}}
  return <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" asChild><Link href={`/app/reports?projectId=${project.id}`}>{t("Lihat Laporan","View Report")}</Link></Button>
    {project.clientPortalEnabled && project.clientPortalSlug ? <Button variant="outline" size="sm" asChild><Link href={`/client-portal/${project.clientPortalSlug}`} target="_blank">{t("Buka Portal Klien","Open Client Portal")}</Link></Button>:null}
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={t("Aksi proyek","Project actions")}><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={()=>setTimeout(()=>editRef.current?.click(),0)}>{t("Ubah Proyek","Edit Project")}</DropdownMenuItem>{project.status === "archived" ? <DropdownMenuItem disabled={busy} onSelect={()=>void restore()}>{t("Pulihkan Proyek","Restore Project")}</DropdownMenuItem> : <DropdownMenuItem disabled={busy} onSelect={()=>void archive()}>{t("Arsipkan","Archive")}</DropdownMenuItem>}<DropdownMenuSeparator/><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>setTimeout(()=>deleteRef.current?.click(),0)}>{t("Hapus Permanen","Delete Permanently")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <ProjectEditDialog project={project} activeProjectServiceIds={activeProjectServiceIds} billingModelLocked={billingModelLocked} trigger={<button ref={editRef} type="button" className="hidden"/>}/>
    <PermanentDeleteButton entityType="project" entityId={project.id} entityName={project.name} redirectTo={project.clientId?`/app/clients/${project.clientId}?tab=projects`:"/app/projects"} trigger={<button ref={deleteRef} type="button" className="hidden"/>}/>
  </div>
}