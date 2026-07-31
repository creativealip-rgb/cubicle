"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { archiveTask, restoreTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";

export type ReusableTaskRow = {
  id: string;
  title: string;
  projectName?: string | null;
  clientName?: string | null;
  assigneeName?: string | null;
  monthMinutes?: number;
  lastUsedAt?: string | null;
  lifecycle: "active" | "archived";
};

export function ReusableTaskWorkspace({ tasks, onMove }: {
  tasks: ReusableTaskRow[];
  onMove?: (id: string, direction: "up" | "down") => void;
}) {
  const router = useRouter();
  async function toggle(row: ReusableTaskRow) {
    if (row.lifecycle === "active") await archiveTask(row.id);
    else await restoreTask(row.id);
    router.refresh();
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="hidden grid-cols-[1fr_12rem_10rem_8rem_9rem_auto] gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase text-muted-foreground md:grid">
        <span>Tugas</span><span>Proyek / Klien</span><span>Penanggung jawab</span><span>Jam bulan ini</span><span>Terakhir dipakai</span><span>Aksi</span>
      </div>
      {tasks.map((row, index) => (
        <div key={row.id} className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:grid-cols-[1fr_12rem_10rem_8rem_9rem_auto] md:items-center md:gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{row.title}</p><Badge variant="outline" className="mt-1 text-[10px]">Reusable · {row.lifecycle}</Badge></div>
          <div className="text-xs text-muted-foreground"><p className="truncate">{row.projectName ?? "—"}</p><p className="truncate text-[10px]">{row.clientName ?? ""}</p></div>
          <span className="text-xs text-muted-foreground">{row.assigneeName ?? "Belum ditugaskan"}</span>
          <span className="text-xs">{((row.monthMinutes ?? 0) / 60).toFixed(1)} jam</span>
          <span className="text-xs text-muted-foreground">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString("id-ID") : "Belum pernah"}</span>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" aria-label="Move Up" disabled={index === 0} onClick={() => onMove?.(row.id, "up")}>↑</Button>
            <Button size="sm" variant="ghost" aria-label="Move Down" disabled={index === tasks.length - 1} onClick={() => onMove?.(row.id, "down")}>↓</Button>
            <Button size="sm" variant="outline" onClick={() => toggle(row)}>{row.lifecycle === "active" ? "Arsipkan" : "Pulihkan"}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
