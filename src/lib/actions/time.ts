"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, workspaces } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { assertTimeEntryContext } from "@/lib/time-entry-context";
import {
  assertHistoricalTimeEntryMutable,
  assertProjectTimeTrackingEnabled,
  getProjectTimeTrackingMode,
} from "@/lib/project-time-tracking-policy-db";
import { timeEntryBillableForMode } from "@/lib/project-time-tracking-policy";

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
  // Optional: quick-stop may leave blank; fill later via timesheet edit.
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  tags: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional(),
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
  await assertTimeEntryContext(db, parsed.workspaceId, parsed);
  const projectMode = parsed.projectId
    ? await assertProjectTimeTrackingEnabled(db, parsed.workspaceId, parsed.projectId)
    : null;

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

  const entry = await db.transaction(async (tx) => {
    // Serializes starts for the same user/workspace even before unique-index conflict.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${parsed.workspaceId}), hashtext(${user.id}))`);
    const openEntries = await tx
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
        await tx.delete(timeEntries).where(eq(timeEntries.id, open.id));
        continue;
      }
      const endCandidate = open.pausedAt ?? new Date();
      await tx
        .update(timeEntries)
        .set({
          endTime: cappedEnd(open.startTime, endCandidate),
          pausedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, open.id));
    }

    const [created] = await tx.insert(timeEntries).values({
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
      billable: projectMode ? timeEntryBillableForMode(projectMode) : false,
      hourlyRate: resolvedRate,
      status: "draft",
    }).returning();
    return created;
  });

  await writeActivityLog(parsed.workspaceId, user.id, "started_timer", "time_entry", entry.id);
  return entry;
}

/**
 * Start timer from a task card/sheet.
 * Resolves client+project from task. Task title remains context only.
 * Stop remains instant — no form required.
 */
export async function startTimerFromTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [row] = await db
    .select({
      taskId: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      clientId: projects.clientId,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);

  if (!row) throw new Error("Task not found");
  if (!row.projectId) throw new Error("Task belum terhubung ke proyek");
  if (!row.clientId) throw new Error("Proyek task belum punya klien");
  await assertProjectTimeTrackingEnabled(db, workspaceId, row.projectId);

  return startTimer({
    workspaceId,
    clientId: row.clientId,
    projectId: row.projectId,
    taskId: row.taskId,
  });
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
  if (entry.userId !== user.id) throw new Error("Timer milik user lain");
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
  if (entry.userId !== user.id) throw new Error("Timer milik user lain");
  if (entry.endTime) throw new Error("Timer already stopped");
  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", entryId);
    return { discarded: true as const };
  }
  if (!entry.pausedAt) {
    return entry; // already running
  }
  if (entry.projectId) {
    await assertProjectTimeTrackingEnabled(db, workspaceId, entry.projectId);
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
 * Stop timer. Client/project/task/description optional — fill later via timesheet edit.
 * If currently paused, endTime = pausedAt (exclude residual pause).
 * Back-compat: string entryId alone still works (quick stop without form fields).
 */
export async function stopTimer(input: z.infer<typeof stopTimerSchema> | string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed =
    typeof input === "string"
      ? stopTimerSchema.parse({ entryId: input })
      : stopTimerSchema.parse(input);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, parsed.entryId), eq(timeEntries.workspaceId, workspaceId)))
    .limit(1);

  if (!entry) throw new Error("Time entry not found");
  if (entry.userId !== user.id) throw new Error("Timer milik user lain");
  if (entry.endTime) throw new Error("Timer already stopped");

  if (!entry.startTime) {
    await db.delete(timeEntries).where(eq(timeEntries.id, parsed.entryId));
    await writeActivityLog(workspaceId, user.id, "discarded_timer", "time_entry", parsed.entryId);
    return { discarded: true as const };
  }

  const endCandidate = entry.pausedAt ?? new Date();
  const finalEnd = cappedEnd(entry.startTime, endCandidate);

  const nextClientId = parsed.clientId ?? entry.clientId ?? null;
  const nextProjectId = parsed.projectId ?? entry.projectId ?? null;
  const nextTaskId = parsed.taskId ?? entry.taskId ?? null;
  if (!nextProjectId) {
    throw new Error("Project wajib dipilih sebelum timer dihentikan");
  }
  const nextDescription =
    parsed.description !== undefined && parsed.description !== null
      ? parsed.description
      : entry.description;
  const nextTags = parsed.tags !== undefined ? parsed.tags : entry.tags;
  await assertTimeEntryContext(db, workspaceId, {
    clientId: nextClientId,
    projectId: nextProjectId,
    taskId: nextTaskId,
  });
  const keepsOriginalProject = nextProjectId === entry.projectId;
  const projectMode = keepsOriginalProject
    ? await getProjectTimeTrackingMode(db, workspaceId, nextProjectId)
    : await assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId);

  const resolvedRate = await resolveHourlyRate({
    workspaceId,
    projectId: nextProjectId,
    explicitRate: parsed.hourlyRate,
  });

  const [updated] = await db
    .update(timeEntries)
    .set({
      clientId: nextClientId,
      projectId: nextProjectId,
      taskId: nextTaskId,
      description: nextDescription,
      tags: nextTags,
      billable: projectMode === "off" ? entry.billable : timeEntryBillableForMode(projectMode),
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
  await assertTimeEntryContext(db, parsed.workspaceId, parsed);
  const projectMode = await assertProjectTimeTrackingEnabled(db, parsed.workspaceId, parsed.projectId);
  const billable = timeEntryBillableForMode(projectMode);

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
  // Only auto-fill when project mode is billable.
  let resolvedRate: string | null = null;
  if (billable) {
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
    billable,
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
  await assertHistoricalTimeEntryMutable(db, workspaceId, entry.projectId);

  const parsed = updateTimeEntrySchema.parse(input);
  const nextClientId = parsed.clientId !== undefined ? parsed.clientId : entry.clientId;
  const nextProjectId = parsed.projectId !== undefined ? parsed.projectId : entry.projectId;
  const nextTaskId = parsed.taskId !== undefined ? parsed.taskId : entry.taskId;
  await assertTimeEntryContext(db, workspaceId, {
    clientId: nextClientId,
    projectId: nextProjectId,
    taskId: nextTaskId,
  });
  if (!nextProjectId) throw new Error("Project wajib dipilih untuk entri waktu");
  const projectMode = await assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.tags !== undefined) updateData.tags = parsed.tags;
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.projectId !== undefined) updateData.projectId = parsed.projectId;
  if (parsed.taskId !== undefined) updateData.taskId = parsed.taskId;
  if (parsed.startTime !== undefined) updateData.startTime = parsed.startTime ? new Date(parsed.startTime) : null;
  if (parsed.endTime !== undefined) updateData.endTime = parsed.endTime ? new Date(parsed.endTime) : null;
  if (parsed.manualMinutes !== undefined) updateData.manualMinutes = parsed.manualMinutes;
  updateData.billable = timeEntryBillableForMode(projectMode);
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
  if (entry.status === "invoiced") {
    throw new Error("Entri sudah di-invoice, tidak bisa dihapus");
  }
  await assertHistoricalTimeEntryMutable(db, workspaceId, entry.projectId);

  await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
  await writeActivityLog(workspaceId, user.id, "deleted_time_entry", "time_entry", entryId);
  return { success: true };
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
