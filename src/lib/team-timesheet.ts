export interface TeamTimeEntry {
  id: string;
  description: string | null;
  clientName: string | null;
  projectName: string | null;
  activityName: string | null;
  taskTitle: string | null;
  userName: string | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  pausedAt: Date | string | null;
  durationMinutes: number | null;
  manualMinutes: number | null;
  status: string;
}

export interface TeamTimesheetDay {
  date: Date;
  entries: TeamTimeEntry[];
  totalMinutes: number;
}

function validDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekRange(now: Date, offset = 0): { start: Date; end: Date } {
  const start = startOfDay(now);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function getEffectiveMinutes(entry: TeamTimeEntry, now = new Date()): number {
  if (entry.durationMinutes != null) return Math.max(0, entry.durationMinutes);
  if (entry.manualMinutes != null) return Math.max(0, entry.manualMinutes);
  const start = validDate(entry.startTime);
  if (!start) return 0;
  const finish = validDate(entry.endTime) ?? validDate(entry.pausedAt) ?? now;
  return Math.max(0, Math.floor((finish.getTime() - start.getTime()) / 60_000));
}

export function buildTodayTimeline(entries: TeamTimeEntry[], now = new Date()): TeamTimeEntry[] {
  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return entries
    .filter((entry) => {
      const date = validDate(entry.startTime);
      return date !== null && date >= start && date < end;
    })
    .sort((left, right) => {
      const leftTime = validDate(left.startTime)?.getTime() ?? 0;
      const rightTime = validDate(right.startTime)?.getTime() ?? 0;
      return leftTime - rightTime;
    });
}

export function buildWeekDays(entries: TeamTimeEntry[], now = new Date(), offset = 0): TeamTimesheetDay[] {
  const { start, end } = getWeekRange(now, offset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const dayEntries = entries
      .filter((entry) => {
        const entryDate = validDate(entry.startTime);
        return entryDate !== null && entryDate >= date && entryDate < next && entryDate >= start && entryDate < end;
      })
      .sort((left, right) => {
        const leftTime = validDate(left.startTime)?.getTime() ?? 0;
        const rightTime = validDate(right.startTime)?.getTime() ?? 0;
        return leftTime - rightTime;
      });
    return {
      date,
      entries: dayEntries,
      totalMinutes: dayEntries.reduce((total, entry) => total + getEffectiveMinutes(entry, now), 0),
    };
  });
}
