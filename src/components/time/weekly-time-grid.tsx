"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { setWeeklyTimeCell } from "@/lib/actions/time";
import { buildWeeklyGrid, formatDurationInput, getWeekDates, parseDurationInput, type WeeklyGridEntry } from "@/lib/weekly-time-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Copy } from "lucide-react";
import { localDateIso, weekStartDate } from "@/lib/effective-work-date";
import { useT } from "@/lib/i18n-client";

type ProjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string; projectId: string };
type AddedRow = { projectId: string; taskId: string };

function key(projectId: string, taskId: string | null) {
  return `${projectId}:${taskId ?? "task"}`;
}

function minutesLabel(minutes: number, hLabel = "j", mLabel = "m") {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}${hLabel} ${rest}${mLabel}` : `${hours}${hLabel}`;
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
  const { refresh } = useAppTransition();
  const { t, lang } = useT();
  const locale = lang === "en" ? "en-US" : "id-ID";
  const hLabel = lang === "en" ? "h" : "j";
  const mLabel = lang === "en" ? "m" : "m";

  const anchor = localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`)));
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const projectContainerRef = useRef<HTMLDivElement>(null);
  const taskContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectContainerRef.current && !projectContainerRef.current.contains(event.target as Node)) {
        setProjectSearchOpen(false);
      }
      if (taskContainerRef.current && !taskContainerRef.current.contains(event.target as Node)) {
        setTaskSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.toLowerCase().trim();
    if (!term) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const availableActivities = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [projectId, tasks]
  );

  const filteredTasks = useMemo(() => {
    const term = taskSearch.toLowerCase().trim();
    if (!term) return availableActivities;
    return availableActivities.filter((t) => t.title.toLowerCase().includes(term));
  }, [availableActivities, taskSearch]);

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
    setProjectId("");
    setTaskId("");
    setProjectSearch("");
    setTaskSearch("");
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
      if (totalMinutes < row.cells[index].immutableMinutes) throw new Error(`${t("Minimal", "Minimum")} ${minutesLabel(row.cells[index].immutableMinutes, hLabel, mLabel)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Durasi tidak valid", "Invalid duration"));
      return;
    }
    if (totalMinutes === row.cells[index].totalMinutes) return;
    startTransition(async () => {
      try {
        await setWeeklyTimeCell({ projectId: row.projectId, taskId: row.taskId!, date: row.cells[index].date, totalMinutes });
        toast.success(t("Waktu tersimpan", "Time saved"));
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("Gagal menyimpan waktu", "Failed to save time"));
      }
    });
  }

  const weekTotalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <section className="rounded-lg border bg-card">
      <div className="p-3">
        {!rows.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("Belum ada baris minggu ini. Tambah Project/Task atau salin struktur minggu lalu.", "No rows for this week yet. Add a Project/Task or copy last week's structure.")}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] gap-1 border-b pb-2 text-center text-xs font-medium text-muted-foreground">
                  <span className="text-left">{t("Project / Task", "Project / Task")}</span>
                  {dates.map((date) => (
                    <span key={date.toISOString()}>
                      {date.toLocaleDateString(locale, { weekday: "short", day: "numeric", timeZone: "UTC" })}
                    </span>
                  ))}
                  <span>{t("Total", "Total")}</span>
                </div>
                {rows.map((row) => (
                  <div key={row.key} className="grid grid-cols-[minmax(210px,1.7fr)_repeat(7,minmax(76px,1fr))_86px] items-center gap-1 border-b py-2">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-medium">{row.projectName}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? t("Tanpa task", "No task")}</p>
                    </div>
                    {row.cells.map((cell, index) => (
                      <Input
                        key={cell.date}
                        className="h-9 text-center text-xs"
                        defaultValue={formatDurationInput(cell.totalMinutes)}
                        disabled={!canWrite || pending || !row.taskId}
                        aria-label={`${row.projectName} ${row.taskTitle ?? t("Tanpa task", "No task")} ${cell.date}`}
                        onBlur={(event) => saveCell(row, index, event.target.value)}
                      />
                    ))}
                    <strong className="text-center text-sm">{minutesLabel(row.totalMinutes, hLabel, mLabel)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <div key={row.key} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.projectName}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.taskTitle ?? t("Tanpa task", "No task")}</p>
                    </div>
                    <strong className="text-sm">{minutesLabel(row.totalMinutes, hLabel, mLabel)}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {row.cells.map((cell, index) => (
                      <label key={cell.date} className="text-xs text-muted-foreground">
                        <span className="mb-1 block">{dates[index].toLocaleDateString(locale, { weekday: "short", day: "numeric", timeZone: "UTC" })}</span>
                        <Input
                          className="h-9 text-center text-xs"
                          defaultValue={formatDurationInput(cell.totalMinutes)}
                          disabled={!canWrite || pending || !row.taskId}
                          onBlur={(event) => saveCell(row, index, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="mr-3 text-muted-foreground">{t("Total minggu", "Week total")}</span>
              <strong>{minutesLabel(weekTotalMinutes, hLabel, mLabel)}</strong>
            </div>
          </>
        )}
        {canWrite && (
          <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <div ref={projectContainerRef} className="relative">
              <Input
                placeholder={t("Cari project...", "Search project...")}
                value={projectSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectSearch(val);
                  setProjectSearchOpen(true);
                }}
                onFocus={() => {
                  setProjectSearchOpen(true);
                }}
                className="h-10 text-sm"
              />
              {projectSearchOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                  {filteredProjects.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">{t("Project tidak ditemukan", "Project not found")}</p>
                  ) : (
                    filteredProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${projectId === p.id ? "bg-accent font-medium" : ""}`}
                        onClick={() => {
                          setProjectId(p.id);
                          setProjectSearch(p.name);
                          setProjectSearchOpen(false);
                          setTaskId("");
                          setTaskSearch("");
                        }}
                      >
                        <span>{p.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div ref={taskContainerRef} className="relative">
              <Input
                placeholder={projectId ? t("Cari task...", "Search task...") : t("Pilih proyek dulu", "Select project first")}
                value={taskSearch}
                disabled={!projectId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTaskSearch(val);
                  setTaskSearchOpen(true);
                }}
                onFocus={() => {
                  if (projectId) setTaskSearchOpen(true);
                }}
                className="h-10 text-sm"
              />
              {taskSearchOpen && projectId && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                  {filteredTasks.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">{t("Task tidak ditemukan", "Task not found")}</p>
                  ) : (
                    filteredTasks.map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${taskId === tItem.id ? "bg-accent font-medium" : ""}`}
                        onClick={() => {
                          setTaskId(tItem.id);
                          setTaskSearch(tItem.title);
                          setTaskSearchOpen(false);
                        }}
                      >
                        <span>{tItem.title}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={addRow} disabled={!projectId || !taskId}>
              <Plus className="h-4 w-4" />
              {t("Tambah baris", "Add row")}
            </Button>
            <Button variant="ghost" onClick={copyPreviousRows} disabled={!previousGrid.rows.length}>
              <Copy className="h-4 w-4" />
              {t("Salin baris minggu lalu", "Copy last week's rows")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
