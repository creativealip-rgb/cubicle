import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { timesheetSubmissions } from "@/db/schema";
import { getWeekDates } from "@/lib/weekly-time-grid";

export function weekStartIso(value: Date | string) {
  return getWeekDates(value)[0].toISOString().slice(0, 10);
}

export async function assertTimesheetWeekMutable(database: Db, workspaceId: string, userId: string, date: Date | string) {
  const weekStart = weekStartIso(date);
  const [submission] = await database.select({ status: timesheetSubmissions.status }).from(timesheetSubmissions).where(and(
    eq(timesheetSubmissions.workspaceId, workspaceId), eq(timesheetSubmissions.userId, userId), eq(timesheetSubmissions.weekStart, weekStart),
  )).limit(1);
  if (submission?.status === "submitted") throw new Error("Timesheet sedang menunggu persetujuan");
  if (submission?.status === "approved") throw new Error("Timesheet sudah disetujui dan terkunci");
  return submission ?? null;
}
