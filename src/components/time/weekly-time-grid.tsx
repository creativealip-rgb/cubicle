"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWeeklyTimeCell } from "@/lib/actions/time";
import { buildWeeklyGrid, formatDurationInput, getWeekDates, parseDurationInput, type WeeklyGridEntry } from "@/lib/weekly-time-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string; projectId: string | null };
type AddedRow = { projectId: string; taskId: string | null };

function key(projectId: string, taskId: string | null) {
  return `${projectId}:${taskId ?? "project"}`;
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}j ${rest}m` : `${hours}j`;
}

export function WeeklyTimeGrid({
  entries,
  projects,
  tasks,
  canWrite,
}: {
  entries: WeeklyGridEntry[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("project");
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
        taskTitle: task?.title ?? null,
        cells: dates.map((date) => ({ date: date.toISOString().slice(0, 10), totalMinutes: 0, editableMinutes: 0, immutableMinutes: 0 })),
        totalMinutes: 0,
      });
    }
    return Array.from(map.values());
  }, [grid.rows, addedRows, projects, tasks, dates]);

  function moveWeek(days: number) {
    const next = new Date(`${anchor}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + days);
    setAnchor(next.toISOString().slice(0, 10));
    setAddedRows([]);
  }

  function addRow() {
    if (!projectId) return;
    const nextTaskId = taskId === "project" ? null : taskId;
    setAddedRows((current) => current.some((row) => key(row.projectId, row.taskId) === key(projectId, nextTaskId)) ? current : [...current, { projectId, taskId: nextTaskId }]);
  }

  function copyPreviousRows() {
    setAddedRows((current) => {
      const known = new Set([...rows.map((row) => row.key), ...current.map((row) => key(row.projectId, row.taskId))]);
      return [...current, ...previousGrid.rows.filter((row) => !known.has(row.key)).map((row) => ({ projectId: row.projectId, taskId: row.taskId }))];
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
        await setWeeklyTimeCell({ projectId: row.projectId, taskId: row.taskId, date: row.cells[index].date, totalMinutes });
        toast.success("Waktu tersimpan");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan waktu");
      }
    });
  }

  const availableTasks = tasks.filter((task) => task.projectId === projectId);
  const weekTotalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <Card>
      <CardHeader className="space-y-4 p-4 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base">Timesheet Mingguan</CardTitle><p className="mt-1 text-xs text-muted-foreground">Input jam langsung per Project dan Tugas</p></div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button size="icon" variant="outline" aria-label="Minggu sebelumnya" onClick={() => moveWeek(-7)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-36 text-center text-xs font-medium">{dates[0].toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} – {dates[6].toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</div>
            <Button size="icon" variant="outline" aria-label="Minggu berikutnya" onClick={() => moveWeek(7)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {canWrite && <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId("project"); }}><SelectTrigger><SelectValue placeholder="Pilih project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
          <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}><SelectTrigger><SelectValue placeholder="Pilih tugas" /></SelectTrigger><SelectContent><SelectItem value="project">Tanpa tugas</SelectItem>{availableTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={addRow} disabled={!projectId}><Plus className="mr-2 h-4 w-4" />Tambah baris</Button>
          <Button variant="ghost" onClick={copyPreviousRows} disabled={!previousGrid.rows.length}><Copy className="mr-2 h-4 w-4" />Salin baris minggu lalu</Button>
        </div>}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {!rows.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada baris minggu ini. Tambah Project/Tugas atau salin struktur minggu lalu.</div> : <>
          <div className="hidden overflow-x-auto lg:block"><div className="min-w-[900px]">
            <div className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] gap-1 border-b pb-2 text-center text-xs font-medium text-muted-foreground"><span className="text-left">Project / Tugas</span>{dates.map((date) => <span key={date.toISOString()}>{date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" })}</span>)}<span>Total</span></div>
            {rows.map((row) => <div key={row.key} className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] items-center gap-1 border-b py-2"><div className="min-w-0 pr-2"><p className="truncate text-sm font-medium">{row.projectName}</p><p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? "Tanpa tugas"}</p></div>{row.cells.map((cell, index) => <Input key={cell.date} className="h-9 text-center text-xs" defaultValue={formatDurationInput(cell.totalMinutes)} disabled={!canWrite || pending} aria-label={`${row.projectName} ${cell.date}`} onBlur={(event) => saveCell(row, index, event.target.value)} />)}<strong className="text-center text-sm">{minutesLabel(row.totalMinutes)}</strong></div>)}
          </div></div>
          <div className="space-y-3 lg:hidden">{rows.map((row) => <div key={row.key} className="rounded-lg border p-3"><div className="mb-3 flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.projectName}</p><p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? "Tanpa tugas"}</p></div><strong className="text-sm">{minutesLabel(row.totalMinutes)}</strong></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{row.cells.map((cell, index) => <label key={cell.date} className="text-xs text-muted-foreground"><span className="mb-1 block">{dates[index].toLocaleDateString("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" })}</span><Input className="h-9 text-center text-xs" defaultValue={formatDurationInput(cell.totalMinutes)} disabled={!canWrite || pending} onBlur={(event) => saveCell(row, index, event.target.value)} /></label>)}</div></div>)}</div>
          <div className="mt-3 flex justify-end rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="mr-3 text-muted-foreground">Total minggu</span><strong>{minutesLabel(weekTotalMinutes)}</strong></div>
        </>}
      </CardContent>
    </Card>
  );
}
