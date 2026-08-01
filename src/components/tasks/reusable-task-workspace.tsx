"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { archiveTask, restoreTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { TaskForm } from "@/components/forms/task-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";

export type ReusableTaskRow = {
  id: string;
  projectId?: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  assigneeName?: string | null;
  monthMinutes?: number;
  lastUsedAt?: string | null;
  lifecycle: "active" | "archived";
};

export function ReusableTaskWorkspace({ tasks, members = [], onMove }: {
  tasks: ReusableTaskRow[];
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  onMove?: (id: string, direction: "up" | "down") => void;
}) {
  const router = useRouter();
  async function toggle(row: ReusableTaskRow) {
    if (row.lifecycle === "active") await archiveTask(row.id);
    else await restoreTask(row.id);
    router.refresh();
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="hidden min-w-[72rem] gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase text-muted-foreground md:grid md:grid-cols-[minmax(14rem,1.5fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_7rem_8rem_minmax(12rem,auto)]">
        <span>Tugas</span><span>Proyek / Klien</span><span>Penanggung jawab</span><span>Jam bulan ini</span><span>Terakhir dipakai</span><span>Aksi</span>
      </div>
      {tasks.map((row, index) => (
        <div key={row.id} className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-w-[72rem] md:grid-cols-[minmax(14rem,1.5fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_7rem_8rem_minmax(12rem,auto)] md:items-center md:gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium" title={row.title}>{row.title}</p><Badge variant="outline" className="mt-1 text-[10px]">Berulang · {row.lifecycle === "active" ? "Aktif" : "Diarsipkan"}</Badge></div>
          <div className="text-xs text-muted-foreground"><p className="truncate">{row.projectName ?? "—"}</p><p className="truncate text-[10px]">{row.clientName ?? ""}</p></div>
          <span className="text-xs text-muted-foreground">{row.assigneeName ?? "Belum ditugaskan"}</span>
          <span className="text-xs">{((row.monthMinutes ?? 0) / 60).toFixed(1)} jam</span>
          <span className="text-xs text-muted-foreground">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString("id-ID") : "Belum pernah"}</span>
          <div className="flex flex-wrap gap-1">
            {onMove && <><Button size="sm" variant="ghost" aria-label="Naikkan urutan" disabled={index === 0} onClick={() => onMove(row.id, "up")}>↑</Button>
            <Button size="sm" variant="ghost" aria-label="Turunkan urutan" disabled={index === tasks.length - 1} onClick={() => onMove(row.id, "down")}>↓</Button></>}
            <Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Ubah</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Ubah Tugas Berulang</DialogTitle></DialogHeader><TaskForm mode="edit" projectId={row.projectId} taskMode="reusable" members={members} defaultValues={{ id: row.id, title: row.title, description: row.description ?? "", assigneeId: row.assigneeId ?? "" }} /></DialogContent></Dialog>
            <Button size="sm" variant="outline" onClick={() => toggle(row)}>{row.lifecycle === "active" ? "Arsipkan" : "Pulihkan"}</Button>
            <PermanentDeleteButton entityType="task" entityId={row.id} entityName={row.title} />
          </div>
        </div>
      ))}
    </div>
  );
}
