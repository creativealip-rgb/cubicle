"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, users, workspaces } from "@/db/schema";
import { eq, and, gte, lte, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

/** Resolve hourly rate: explicit → project rate (any billing) → workspace default. */
async function resolveHourlyRate(opts: {
  workspaceId: string;
  projectId?: string | null;
  explicitRate?: number | null;
}): Promise<string | null> {
  if (opts.explicitRate !== undefined && opts.explicitRate !== null) {
    const n = Number(opts.explicitRate);
    if (Number.isFinite(n) && n >= 0) return String(n);
  }

  if (opts.projectId) {
    const [proj] = await db
      .select({ rate: projects.rate })
      .from(projects)
      .where(eq(projects.id, opts.projectId))
      .limit(1);
    if (proj?.rate) {
      const projectRate = Number(proj.rate);
      if (Number.isFinite(projectRate) && projectRate > 0) return String(projectRate);
    }
  }

  const [ws] = await db
    .select({ defaultHourlyRate: workspaces.defaultHourlyRate })
    .from(workspaces)
    .where(eq(workspaces.id, opts.workspaceId))
    .limit(1);
  if (ws?.defaultHourlyRate) {
    const wsDefault = Number(ws.defaultHourlyRate);
    if (Number.isFinite(wsDefault) && wsDefault > 0) return String(wsDefault);
  }

  return null;
}

const startTimerSchema = z.object({
  workspaceId: z.string().uuid(),
  // Quick timer may start empty; fill required fields on stop.
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional(),
});

const createManualEntrySchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  date: z.string().min(1),
  durationMinutes: z.number().positive(),
  billable: z.boolean().default(true),
  hourlyRate: z.number().nonnegative().optional(),
});

const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  tags: z.string().nullable().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  manualMinutes: z.number().nullable().optional(),
  billable: z.boolean().optional(),
  status: z.enum(["draft", "approved", "invoiced"]).optional(),
});

const stopTimerSchema = z.object({
  entryId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid({ message: "Task wajib diisi" }),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  tags: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional(),
});

const exportCsvFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  billable: z.boolean().optional(),
});

/** Cap single timer segment at 24h from start. */
function cappedEnd(startTime: Date, candidate: Date): Date {
  const maxEnd = new Date(startTime.getTime() + 24 * 3600 * 1000);
  return candidate > maxEnd ? maxEnd : candidate;
}

export async function startTimer(input: z.infer<typeof startTimerSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = startTimerSchema.parse(input);

  // Auto-close any existing open timer for this user in this workspace.
  // Paused entries close at pausedAt; running ones close at now.
  const openEntries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.workspaceId, parsed.workspaceId),
        eq(timeEntries.userId, user.id),
        isNull(timeEntries.endTime),
        isNull(timeEntries.manualMinutes),
      ),
    );

  for (const open of openEntries) {
    if (!open.startTime) {
      await db.delete(timeEntries).where(eq(timeEntries.id, open.id));
      continue;
    }
    const endCandidate = open.pausedAt ?? new Date();
    await db
      .update(timeEntries)
      .set({
        endTime: cappedEnd(open.startTime, endCandidate),
        pausedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, open.id));
  }

  const resolvedRate = parsed.projectId
    ? await resolveHourlyRate({
        workspaceId: parsed.workspaceId,
        projectId: parsed.projectId,
        explicitRate: parsed.hourlyRate,
      })
    : parsed.hourlyRate !== undefined
      ? String(parsed.hourlyRate)
      : await resolveHourlyRate({
          workspaceId: parsed.workspaceId,
          projectId: null,
          explicitRate: parsed.hourlyRate,
        });

  const [entry] = await db.insert(timeEntries).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId || null,
    projectId: parsed.projectId || null,
    taskId: parsed.taskId || null,
    userId: user.id,
    description: parsed.description || null,
    tags: parsed.tags || null,
    startTime: new Date(),
    endTime: null,
    pausedAt: null,
    manualMinutes: null,
    billable: true,
    hourlyRate: resolvedRate,
    status: "draft",
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "started_timer", "time_entry", entry.id);
  return entry;
}

/** Pause keeps the same open entry (endTime stays null). */
export async function pauseTimer(entryId: string) {
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
  if (entry.endTime) throw new Error("Timer already stopped");
  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", entryId);
    return { discarded: true as const };
  }
  if (entry.pausedAt) {
    return entry; // already paused
  }

  const [updated] = await db
    .update(timeEntries)
    .set({ pausedAt: new Date(), updatedAt: new Date() })
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "paused_timer", "time_entry", entryId);
  return updated;
}

/**
 * Resume same entry: shift startTime forward by pause duration so
 * generated durationMinutes (end - start) still excludes paused time.
 */
export async function resumeTimer(entryId: string) {
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
  if (entry.endTime) throw new Error("Timer already stopped");
  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", entryId);
    return { discarded: true as const };
  }
  if (!entry.pausedAt) {
    return entry; // already running
  }

  const now = new Date();
  const pauseMs = Math.max(0, now.getTime() - entry.pausedAt.getTime());
  const shiftedStart = new Date(entry.startTime.getTime() + pauseMs);

  const [updated] = await db
    .update(timeEntries)
    .set({
      startTime: shiftedStart,
      pausedAt: null,
      updatedAt: now,
    })
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "resumed_timer", "time_entry", entryId);
  return updated;
}

/**
 * Stop requires client / project / task / description filled on the same entry.
 * If currently paused, endTime = pausedAt (exclude residual pause).
 */
export async function stopTimer(input: z.infer<typeof stopTimerSchema> | string) {
  // Back-compat: old callers passed entryId only — reject with clear message.
  if (typeof input === "string") {
    throw new Error("Stop timer wajib isi client, project, task, dan deskripsi");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = stopTimerSchema.parse(input);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, parsed.entryId), eq(timeEntries.workspaceId, workspaceId)))
    .limit(1);

  if (!entry) throw new Error("Time entry not found");
  if (entry.endTime) throw new Error("Timer already stopped");

  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, parsed.entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", parsed.entryId);
    return { discarded: true as const };
  }

  const endCandidate = entry.pausedAt ?? new Date();
  const finalEnd = cappedEnd(entry.startTime, endCandidate);

  const resolvedRate = await resolveHourlyRate({
    workspaceId,
    projectId: parsed.projectId,
    explicitRate: parsed.hourlyRate,
  });

  const [updated] = await db
    .update(timeEntries)
    .set({
      clientId: parsed.clientId,
      projectId: parsed.projectId,
      taskId: parsed.taskId,
      description: parsed.description,
      tags: parsed.tags ?? entry.tags,
      hourlyRate: resolvedRate ?? entry.hourlyRate,
      endTime: finalEnd,
      pausedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(timeEntries.id, parsed.entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "stopped_timer", "time_entry", parsed.entryId);
  return updated;
}

export async function createManualEntry(input: z.infer<typeof createManualEntrySchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = createManualEntrySchema.parse(input);

  // Manual entry is NOT a running timer. Set both start + end from the
  // chosen date + duration so active-timer queries (endTime IS NULL) never
  // pick it up. Previously endTime=null made seed/manual rows look like
  // active timers and the navbar clock jumped by hours.
  const start = new Date(`${parsed.date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid date");
  }
  const end = new Date(start.getTime() + parsed.durationMinutes * 60 * 1000);

  // Resolve rate: explicit input → project rate → workspace default.
  // Only auto-fill when billable.
  let resolvedRate: string | null = null;
  if (parsed.billable) {
    resolvedRate = await resolveHourlyRate({
      workspaceId: parsed.workspaceId,
      projectId: parsed.projectId,
      explicitRate: parsed.hourlyRate,
    });
  }

  const [entry] = await db.insert(timeEntries).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId,
    taskId: parsed.taskId || null,
    userId: user.id,
    description: parsed.description || null,
    tags: parsed.tags || null,
    startTime: start,
    endTime: end,
    pausedAt: null,
    manualMinutes: parsed.durationMinutes,
    billable: parsed.billable,
    hourlyRate: resolvedRate,
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
  if (entry.status === "invoiced") {
    throw new Error("Entri sudah di-invoice, tidak bisa diedit");
  }

  const parsed = updateTimeEntrySchema.parse(input);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.tags !== undefined) updateData.tags = parsed.tags;
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.projectId !== undefined) updateData.projectId = parsed.projectId;
  if (parsed.taskId !== undefined) updateData.taskId = parsed.taskId;
  if (parsed.startTime !== undefined) updateData.startTime = parsed.startTime ? new Date(parsed.startTime) : null;
  if (parsed.endTime !== undefined) updateData.endTime = parsed.endTime ? new Date(parsed.endTime) : null;
  if (parsed.manualMinutes !== undefined) updateData.manualMinutes = parsed.manualMinutes;
  if (parsed.billable !== undefined) updateData.billable = parsed.billable;
  if (parsed.status !== undefined) {
    if (parsed.status === "invoiced") {
      throw new Error("Status invoiced hanya lewat proses invoice");
    }
    updateData.status = parsed.status;
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_time_entry", "time_entry", entryId);
  return updated;
}

/** Discard open timer without saving form fields. */
export async function discardTimer(entryId: string) {
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
  if (entry.endTime) throw new Error("Timer already stopped");
  if (entry.userId !== user.id) throw new Error("Timer milik user lain");

  await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
  await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", entryId);
  return { success: true as const };
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
      pausedAt: timeEntries.pausedAt,
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
        // Running/paused timers only — exclude closed manual entries (manual_minutes set).
        isNull(timeEntries.manualMinutes),
        // Defensive: never return an active timer without a valid startTime
        // (corrupt seed data would otherwise display 56+ year elapsed values)
        isNotNull(timeEntries.startTime),
      ),
    )
    .limit(1);

  return entry || null;
}
