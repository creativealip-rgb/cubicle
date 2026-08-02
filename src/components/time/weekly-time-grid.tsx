"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWeeklyTimeCell } from "@/lib/actions/time";
import { buildWeeklyGrid, formatDurationInput, getWeekDates, parseDurationInput, type WeeklyGridEntry } from "@/lib/weekly-time-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy } from "lucide-react";
import { localDateIso, weekStartDate } from "@/lib/effective-work-date";

type ProjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string; projectId: string };
type AddedRow = { projectId: string; taskId: string };

function key(projectId: string, taskId: string | null) {
  return `${projectId}:${taskId ?? "task"}`;
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}j ${rest}m` : `${hours}j`;
}

export function WeeklyTimeGrid({
  selectedDate,
  entries,
  projects,
  tasks,
  canWrite,
}: {
  selectedDate: string;
  entries: WeeklyGridEntry[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const anchor = localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`)));
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [pending, startTransition] = useTransition();
  const grid = useMemo(() => buildWeeklyGrid(entries, anchor), [entries, anchor]);
  const dates = useMemo(() => getWeekDates(anchor), [anchor]);
  const previousAnchor = useMemo(() => {
    const value = new Date(dates[0]);
    value.setUTCDate(value.getUTCDate() - 7);
    return value;
  }, [dates]);
  const previousGrid = useMemo(() => buildWeeklyGrid(entries, previousAnchor), [entries, previousAnchor]);

  const rows = useMemo(() => {
    const map = new Map(grid.rows.map((row) => [row.key, row]));
    for (const added of addedRows) {
      const rowKey = key(added.projectId, added.taskId);
      if (map.has(rowKey)) continue;
      const project = projects.find((item) => item.id === added.projectId);
      const task = tasks.find((item) => item.id === added.taskId);
      map.set(rowKey, {
        key: rowKey,
        projectId: added.projectId,
        projectName: project?.name ?? "Project",
        taskId: added.taskId,
        taskTitle: task?.title ?? "Task",
        cells: dates.map((date) => ({ date: date.toISOString().slice(0, 10), totalMinutes: 0, editableMinutes: 0, immutableMinutes: 0 })),
        totalMinutes: 0,
      });
    }
    return Array.from(map.values());
  }, [grid.rows, addedRows, projects, tasks, dates]);

  function addRow() {
    if (!projectId) return;
    if (!taskId) return;
    setAddedRows((current) => current.some((row) => key(row.projectId, row.taskId) === key(projectId, taskId)) ? current : [...current, { projectId, taskId }]);
  }

  function copyPreviousRows() {
    setAddedRows((current) => {
      const known = new Set([...rows.map((row) => row.key), ...current.map((row) => key(row.projectId, row.taskId))]);
      return [...current, ...previousGrid.rows.filter((row) => row.taskId && !known.has(row.key)).map((row) => ({ projectId: row.projectId, taskId: row.taskId! }))];
    });
  }

  function saveCell(row: (typeof rows)[number], index: number, raw: string) {
    let totalMinutes: number;
    try {
      totalMinutes = parseDurationInput(raw);
      if (totalMinutes < row.cells[index].immutableMinutes) throw new Error(`Minimum ${minutesLabel(row.cells[index].immutableMinutes)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Durasi tidak valid");
      return;
    }
    if (totalMinutes === row.cells[index].totalMinutes) return;
    startTransition(async () => {
      try {
        await setWeeklyTimeCell({ projectId: row.projectId, taskId: row.taskId!, date: row.cells[index].date, totalMinutes });
        toast.success("Waktu tersimpan");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan waktu");
      }
    });
  }

  const availableActivities = tasks.filter((task) => task.projectId === projectId);
  const weekTotalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <section className="rounded-lg border bg-card">
      <div className="p-3">
        {!rows.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada baris minggu ini. Tambah Project/Task atau salin struktur minggu lalu.</div> : <>
          <div className="hidden overflow-x-auto lg:block"><div className="min-w-[900px]">
            <div className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] gap-1 border-b pb-2 text-center text-xs font-medium text-muted-foreground"><span className="text-left">Project / Task</span>{dates.map((date) => <span key={date.toISOString()}>{date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" })}</span>)}<span>Total</span></div>
            {rows.map((row) => <div key={row.key} className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] items-center gap-1 border-b py-2"><div className="min-w-0 pr-2"><p className="truncate text-sm font-medium">{row.projectName}</p><p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? "Tanpa task"}</p></div>{row.cells.map((cell, index) => <Input key={cell.date} className="h-9 text-center text-xs" defaultValue={formatDurationInput(cell.totalMinutes)} disabled={!canWrite || pending || !row.taskId} aria-label={`${row.projectName} ${row.taskTitle ?? "Tanpa task"} ${cell.date}`} onBlur={(event) => saveCell(row, index, event.target.value)} />)}<strong className="text-center text-sm">{minutesLabel(row.totalMinutes)}</strong></div>)}
          </div></div>
          <div className="space-y-3 lg:hidden">{rows.map((row) => <div key={row.key} className="rounded-lg border p-3"><div className="mb-3 flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.projectName}</p><p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? "Tanpa task"}</p></div><strong className="text-sm">{minutesLabel(row.totalMinutes)}</strong></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{row.cells.map((cell, index) => <label key={cell.date} className="text-xs text-muted-foreground"><span className="mb-1 block">{dates[index].toLocaleDateString("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" })}</span><Input className="h-9 text-center text-xs" defaultValue={formatDurationInput(cell.totalMinutes)} disabled={!canWrite || pending || !row.taskId} onBlur={(event) => saveCell(row, index, event.target.value)} /></label>)}</div></div>)}</div>
          <div className="mt-3 flex justify-end rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="mr-3 text-muted-foreground">Total minggu</span><strong>{minutesLabel(weekTotalMinutes)}</strong></div>
        </>}
        {canWrite && <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId(""); }}><SelectTrigger><SelectValue placeholder="Pilih project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
          <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}><SelectTrigger><SelectValue placeholder="Pilih task" /></SelectTrigger><SelectContent>{availableActivities.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={addRow} disabled={!projectId || !taskId}><Plus className="mr-2 h-4 w-4" />Tambah baris</Button>
          <Button variant="ghost" onClick={copyPreviousRows} disabled={!previousGrid.rows.length}><Copy className="mr-2 h-4 w-4" />Salin baris minggu lalu</Button>
        </div>}
      </div>
    </section>
  );
}
