"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, users } from "@/db/schema";
import { eq, and, gte, lte, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const startTimerSchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
});

const createManualEntrySchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
  date: z.string().min(1),
  durationMinutes: z.number().positive(),
  billable: z.boolean().default(true),
});

const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  manualMinutes: z.number().nullable().optional(),
  billable: z.boolean().optional(),
  status: z.enum(["draft", "approved", "invoiced"]).optional(),
});

const exportCsvFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  billable: z.boolean().optional(),
});

export async function startTimer(input: z.infer<typeof startTimerSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = startTimerSchema.parse(input);

  // Auto-stop any existing active timer for this user in this workspace
  await db
    .update(timeEntries)
    .set({ endTime: new Date() })
    .where(
      and(
        eq(timeEntries.workspaceId, parsed.workspaceId),
        eq(timeEntries.userId, user.id),
        isNull(timeEntries.endTime),
      ),
    );

  const [entry] = await db.insert(timeEntries).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId,
    taskId: parsed.taskId || null,
    userId: user.id,
    description: parsed.description || null,
    startTime: new Date(),
    endTime: null,
    manualMinutes: null,
    billable: true,
    status: "draft",
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "started_timer", "time_entry", entry.id);
  return entry;
}

export async function stopTimer(entryId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.workspaceId, workspaceId)))
    .limit(1);

  if (!entry) throw new Error("Time entry not found");

  // Defensive: if startTime is null, entry is corrupt — delete instead of saving garbage
  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", entryId);
    return { discarded: true };
  }

  // Defensive: cap stop at sane duration (no > 24h single entries)
  const endTime = new Date();
  const maxEnd = new Date(entry.startTime.getTime() + 24 * 3600 * 1000);
  const finalEnd = endTime > maxEnd ? maxEnd : endTime;

  const [updated] = await db
    .update(timeEntries)
    .set({ endTime: finalEnd, updatedAt: new Date() })
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "stopped_timer", "time_entry", entryId);
  return updated;
}

export async function createManualEntry(input: z.infer<typeof createManualEntrySchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = createManualEntrySchema.parse(input);

  const [entry] = await db.insert(timeEntries).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId,
    taskId: parsed.taskId || null,
    userId: user.id,
    description: parsed.description || null,
    startTime: new Date(parsed.date),
    endTime: null,
    manualMinutes: parsed.durationMinutes,
    billable: parsed.billable,
    status: "draft",
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_time_entry", "time_entry", entry.id);
  return entry;
}

export async function updateTimeEntry(entryId: string, input: z.infer<typeof updateTimeEntrySchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.workspaceId, workspaceId)))
    .limit(1);

  if (!entry) throw new Error("Time entry not found");

  const parsed = updateTimeEntrySchema.parse(input);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.projectId !== undefined) updateData.projectId = parsed.projectId;
  if (parsed.taskId !== undefined) updateData.taskId = parsed.taskId;
  if (parsed.startTime !== undefined) updateData.startTime = parsed.startTime ? new Date(parsed.startTime) : null;
  if (parsed.endTime !== undefined) updateData.endTime = parsed.endTime ? new Date(parsed.endTime) : null;
  if (parsed.manualMinutes !== undefined) updateData.manualMinutes = parsed.manualMinutes;
  if (parsed.billable !== undefined) updateData.billable = parsed.billable;
  if (parsed.status !== undefined) updateData.status = parsed.status;

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_time_entry", "time_entry", entryId);
  return updated;
}

export async function deleteTimeEntry(entryId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.workspaceId, workspaceId)))
    .limit(1);

  if (!entry) throw new Error("Time entry not found");

  await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
  await writeActivityLog(workspaceId, user.id, "deleted_time_entry", "time_entry", entryId);
  return { success: true };
}

export async function exportTimeCsv(filters: z.infer<typeof exportCsvFiltersSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceMember(db, user.id, filters.workspaceId);

  const parsed = exportCsvFiltersSchema.parse(filters);

  const conditions = [eq(timeEntries.workspaceId, parsed.workspaceId)];
  if (parsed.clientId) conditions.push(eq(timeEntries.clientId, parsed.clientId));
  if (parsed.projectId) conditions.push(eq(timeEntries.projectId, parsed.projectId));
  if (parsed.dateFrom) conditions.push(gte(timeEntries.startTime, new Date(parsed.dateFrom)));
  if (parsed.dateTo) conditions.push(lte(timeEntries.startTime, new Date(parsed.dateTo)));
  if (parsed.billable !== undefined) conditions.push(eq(timeEntries.billable, parsed.billable));

  const entries = await db
    .select({
      date: timeEntries.startTime,
      client: clients.name,
      project: projects.name,
      task: tasks.title,
      description: timeEntries.description,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      user: users.name,
      status: timeEntries.status,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startTime))
    .limit(5000);

  const header = "Date,Client,Project,Task,Description,Minutes,Billable,User,Status";
  const rows = entries.map((e) => {
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
      escape(e.date ? new Date(e.date).toISOString().split("T")[0] : ""),
      escape(e.client),
      escape(e.project),
      escape(e.task),
      escape(e.description),
      String(e.durationMinutes ?? 0),
      String(e.billable ?? false),
      escape(e.user),
      escape(e.status),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  await writeActivityLog(parsed.workspaceId, user.id, "exported_time_csv", "time_entry");
  return csv;
}

export async function getActiveTimer(workspaceId: string, userId: string) {
  const [entry] = await db
    .select({
      id: timeEntries.id,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
      description: timeEntries.description,
      startTime: timeEntries.startTime,
      clientName: clients.name,
      projectName: projects.name,
      taskTitle: tasks.title,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        eq(timeEntries.userId, userId),
        isNull(timeEntries.endTime),
        // Defensive: never return an active timer without a valid startTime
        // (corrupt seed data would otherwise display 56+ year elapsed values)
        isNotNull(timeEntries.startTime),
      ),
    )
    .limit(1);

  return entry || null;
}
