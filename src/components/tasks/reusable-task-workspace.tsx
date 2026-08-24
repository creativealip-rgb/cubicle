"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { useT } from "@/lib/i18n-client";

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

export function ReusableTaskWorkspace({ tasks, members = [], projects = [], onMove, addTask }: {
  tasks: ReusableTaskRow[];
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string }>;
  onMove?: (id: string, direction: "up" | "down") => void;
  addTask?: ReactNode;
}) {
  const { t } = useT();

  return (
    <div className="space-y-3">
      {addTask && <div className="flex justify-end">{addTask}</div>}
      <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="hidden min-w-[50rem] gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase text-muted-foreground md:grid md:grid-cols-[minmax(12rem,1.5fr)_minmax(10rem,1fr)_minmax(8rem,.8fr)_6rem_7rem_6rem]">
        <span>{t("Tugas", "Task")}</span>
        <span>{t("Proyek / Klien", "Project / Client")}</span>
        <span>{t("Penanggung jawab", "Assignee")}</span>
        <span>{t("Jam bulan ini", "Hours this month")}</span>
        <span>{t("Terakhir dipakai", "Last used")}</span>
        <span>{t("Urutan", "Reorder")}</span>
      </div>
      {tasks.map((row, index) => {
        const fullTask = {
          id: row.id,
          title: row.title,
          description: row.description ?? "",
          status: "todo",
          priority: "medium",
          assigneeId: row.assigneeId ?? "",
          assigneeName: row.assigneeName ?? "",
          dueDate: "",
          position: index,
          clientVisible: true,
          projectId: row.projectId,
          projectName: row.projectName,
          mode: "reusable" as const,
          lifecycle: row.lifecycle,
        };

        return (
          <div key={row.id} className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-w-[50rem] md:grid-cols-[minmax(12rem,1.5fr)_minmax(10rem,1fr)_minmax(8rem,.8fr)_6rem_7rem_6rem] md:items-center md:gap-3">
            <TaskDetailSheet task={fullTask} members={members} projects={projects}>
              <div className="min-w-0 group hover:opacity-80 transition-opacity">
                <p className="truncate text-sm font-medium group-hover:text-primary transition-colors" title={row.title}>
                  {row.title}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {t("Berulang", "Recurring")} · {row.lifecycle === "active" ? t("Aktif", "Active") : t("Diarsipkan", "Archived")}
                </Badge>
              </div>
            </TaskDetailSheet>
            <div className="text-xs text-muted-foreground">
              <p className="truncate">{row.projectName ?? "—"}</p>
              <p className="truncate text-[10px]">{row.clientName ?? ""}</p>
            </div>
            <span className="text-xs text-muted-foreground">{row.assigneeName ?? t("Belum ditugaskan", "Unassigned")}</span>
            <span className="text-xs">{((row.monthMinutes ?? 0) / 60).toFixed(1)} {t("jam", "hr")}</span>
            <span className="text-xs text-muted-foreground">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString("id-ID") : t("Belum pernah", "Never")}</span>
            <div className="flex items-center gap-1">
              {onMove && (
                <>
                  <Button size="sm" variant="ghost" aria-label="Naikkan urutan" disabled={index === 0} onClick={() => onMove(row.id, "up")}>
                    ↑
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Turunkan urutan" disabled={index === tasks.length - 1} onClick={() => onMove(row.id, "down")}>
                    ↓
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
