"use server";

import { headers } from "next/headers";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeEntries, timesheetSubmissions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertWorkspaceOwner, assertWorkspaceWritable, requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { weekStartIso } from "@/lib/timesheet-approval";
import { writeActivityLog } from "@/lib/actions/activity";

const submitSchema = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().trim().max(1000).optional() });
const reviewSchema = z.object({ submissionId: z.string().uuid(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).optional() });

function range(weekStart: string) {
  const start = new Date(`${weekStartIso(weekStart)}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + 7 * 86_400_000), iso: start.toISOString().slice(0, 10) };
}

export async function submitWeeklyTimesheet(input: z.infer<typeof submitSchema>) {
  const user = requireUser((await auth.api.getSession({ headers: await headers() }))?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = submitSchema.parse(input);
  const { start, end, iso } = range(parsed.weekStart);
  const rows = await db.select({ minutes: timeEntries.durationMinutes, billable: timeEntries.billable }).from(timeEntries).where(and(
    eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.userId, user.id), gte(timeEntries.startTime, start), lt(timeEntries.startTime, end), ne(timeEntries.status, "invoiced"),
  ));
  if (!rows.length) throw new Error("Tidak ada entri waktu untuk dikirim");
  const totalMinutes = rows.reduce((sum, row) => sum + Number(row.minutes ?? 0), 0);
  const billableMinutes = rows.filter((row) => row.billable).reduce((sum, row) => sum + Number(row.minutes ?? 0), 0);
  const [submission] = await db.insert(timesheetSubmissions).values({ workspaceId, userId: user.id, weekStart: iso, status: "submitted", submitterNote: parsed.note || null, reviewNote: null, totalMinutes, billableMinutes, submittedAt: new Date(), reviewedAt: null, reviewedBy: null, updatedAt: new Date() }).onConflictDoUpdate({
    target: [timesheetSubmissions.workspaceId, timesheetSubmissions.userId, timesheetSubmissions.weekStart],
    set: { status: "submitted", submitterNote: parsed.note || null, reviewNote: null, totalMinutes, billableMinutes, submittedAt: new Date(), reviewedAt: null, reviewedBy: null, updatedAt: new Date() },
  }).returning();
  await writeActivityLog(workspaceId, user.id, "submitted_weekly_timesheet", "timesheet_submission", submission.id);
  return submission;
}

export async function reviewWeeklyTimesheet(input: z.infer<typeof reviewSchema>) {
  const user = requireUser((await auth.api.getSession({ headers: await headers() }))?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceOwner(db, user.id, workspaceId);
  const parsed = reviewSchema.parse(input);
  if (parsed.decision === "rejected" && !parsed.note) throw new Error("Catatan penolakan wajib diisi");
  const [submission] = await db.select().from(timesheetSubmissions).where(and(eq(timesheetSubmissions.id, parsed.submissionId), eq(timesheetSubmissions.workspaceId, workspaceId))).limit(1);
  if (!submission || submission.status !== "submitted") throw new Error("Timesheet tidak tersedia untuk direview");
  const { start, end } = range(submission.weekStart);
  const entryStatus = parsed.decision === "approved" ? "approved" : "draft";
  await db.transaction(async (tx) => {
    await tx.update(timeEntries).set({ status: entryStatus, updatedAt: new Date() }).where(and(eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.userId, submission.userId), gte(timeEntries.startTime, start), lt(timeEntries.startTime, end), ne(timeEntries.status, "invoiced")));
    await tx.update(timesheetSubmissions).set({ status: parsed.decision, reviewNote: parsed.note || null, reviewedAt: new Date(), reviewedBy: user.id, updatedAt: new Date() }).where(eq(timesheetSubmissions.id, submission.id));
  });
  await writeActivityLog(workspaceId, user.id, `${parsed.decision}_weekly_timesheet`, "timesheet_submission", submission.id);
  return { ...submission, status: parsed.decision };
}
