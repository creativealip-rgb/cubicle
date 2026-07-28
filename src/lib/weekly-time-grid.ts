export const WEEKLY_GRID_TAG = "mh1-weekly-grid";

export interface WeeklyGridEntry {
  id: string;
  projectId: string | null;
  projectName: string | null;
  activityId: string | null;
  activityName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  startTime: Date | string | null;
  durationMinutes: number | null;
  manualMinutes: number | null;
  tags: string | null;
  status: string;
}

export interface WeeklyGridCell {
  date: string;
  totalMinutes: number;
  editableMinutes: number;
  immutableMinutes: number;
}

export interface WeeklyGridRow {
  key: string;
  projectId: string;
  projectName: string;
  activityId: string | null;
  activityName: string | null;
  cells: WeeklyGridCell[];
  totalMinutes: number;
}

function isoDate(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function getWeekDates(anchor: Date | string): Date[] {
  const source = typeof anchor === "string" ? new Date(`${anchor.slice(0, 10)}T00:00:00.000Z`) : new Date(anchor);
  if (Number.isNaN(source.getTime())) throw new Error("Tanggal tidak valid");
  source.setUTCHours(0, 0, 0, 0);
  const mondayOffset = (source.getUTCDay() + 6) % 7;
  source.setUTCDate(source.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(source);
    date.setUTCDate(date.getUTCDate() + index);
    return date;
  });
}

export function parseDurationInput(raw: string): number {
  const value = raw.trim().toLowerCase();
  if (!value) return 0;
  if (value.startsWith("-")) throw new Error("Durasi tidak boleh negatif");

  let minutes: number | null = null;
  if (/^\d+(?:[.,]\d+)?$/.test(value)) {
    minutes = Math.round(Number(value.replace(",", ".")) * 60);
  } else {
    const clock = value.match(/^(\d{1,2}):(\d{1,2})$/);
    const words = value.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
    if (clock) {
      const rest = Number(clock[2]);
      if (rest >= 60) throw new Error("Menit harus kurang dari 60");
      minutes = Number(clock[1]) * 60 + rest;
    } else if (words && (words[1] || words[2])) {
      minutes = Number(words[1] || 0) * 60 + Number(words[2] || 0);
    }
  }

  if (minutes == null || !Number.isFinite(minutes)) throw new Error("Format durasi tidak valid");
  if (minutes > 24 * 60) throw new Error("Maksimum 24 jam per hari");
  return minutes;
}

export function formatDurationInput(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return String(hours);
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

export function buildWeeklyGrid(entries: WeeklyGridEntry[], anchor: Date | string) {
  const dates = getWeekDates(anchor);
  const dateKeys = dates.map((date) => date.toISOString().slice(0, 10));
  const dateIndexes = new Map(dateKeys.map((date, index) => [date, index]));
  const rows = new Map<string, WeeklyGridRow>();

  for (const entry of entries) {
    if (!entry.projectId) continue;
    const date = isoDate(entry.startTime);
    const dayIndex = date ? dateIndexes.get(date) : undefined;
    if (dayIndex == null) continue;
    const key = `${entry.projectId}:${entry.activityId ?? "activity"}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        projectId: entry.projectId,
        projectName: entry.projectName || "Project",
        activityId: entry.activityId,
        activityName: entry.activityName,
        cells: dateKeys.map((day) => ({ date: day, totalMinutes: 0, editableMinutes: 0, immutableMinutes: 0 })),
        totalMinutes: 0,
      };
      rows.set(key, row);
    }
    const minutes = Math.max(0, entry.durationMinutes ?? entry.manualMinutes ?? 0);
    const editable = entry.status === "draft" && entry.manualMinutes != null && entry.tags?.split(",").map((tag) => tag.trim()).includes(WEEKLY_GRID_TAG);
    row.cells[dayIndex].totalMinutes += minutes;
    if (editable) row.cells[dayIndex].editableMinutes += minutes;
    else row.cells[dayIndex].immutableMinutes += minutes;
    row.totalMinutes += minutes;
  }

  const resultRows = Array.from(rows.values()).sort((left, right) =>
    left.projectName.localeCompare(right.projectName) || (left.activityName || "").localeCompare(right.activityName || ""),
  );
  const dayTotals = dateKeys.map((_, index) => resultRows.reduce((sum, row) => sum + row.cells[index].totalMinutes, 0));
  return { dates, rows: resultRows, dayTotals, weekTotalMinutes: dayTotals.reduce((sum, value) => sum + value, 0) };
}
