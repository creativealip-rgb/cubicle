"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, workspaces } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql, gte, lt } from "drizzle-orm";
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
import { resolveActivityHourlyRate } from "@/lib/activity-policy";
import { assertActivityWriteAllowed } from "@/lib/activity-policy-db";
import { WEEKLY_GRID_TAG } from "@/lib/weekly-time-grid";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

/** Resolve hourly-rate snapshot from explicit input down to workspace default. */
async function resolveHourlyRate(opts: {
  workspaceId: string;
  projectId?: string | null;
  explicitRate?: number | null;
  projectActivityRate?: number | null;
  activityDefaultRate?: number | null;
}): Promise<string | null> {
  let projectRate: number | null = null;
  if (opts.projectId) {
    const [project] = await db
      .select({ rate: projects.rate })
      .from(projects)
      .where(and(eq(projects.id, opts.projectId), eq(projects.workspaceId, opts.workspaceId)))
      .limit(1);
    const value = Number(project?.rate);
    if (project?.rate != null && Number.isFinite(value) && value >= 0) projectRate = value;
  }

  let workspaceDefaultRate: number | null = null;
  const [workspace] = await db
    .select({ defaultHourlyRate: workspaces.defaultHourlyRate })
    .from(workspaces)
    .where(eq(workspaces.id, opts.workspaceId))
    .limit(1);
  const workspaceValue = Number(workspace?.defaultHourlyRate);
  if (workspace?.defaultHourlyRate != null && Number.isFinite(workspaceValue) && workspaceValue >= 0) {
    workspaceDefaultRate = workspaceValue;
  }

  const resolved = resolveActivityHourlyRate({
    explicitRate: opts.explicitRate,
    projectActivityRate: opts.projectActivityRate,
    activityDefaultRate: opts.activityDefaultRate,
    projectRate,
    workspaceDefaultRate,
  });
  return resolved == null ? null : String(resolved);
}

const startTimerSchema = z.object({
  workspaceId: z.string().uuid(),
  // Quick timer may start empty; fill required fields on stop.
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  activityId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional(),
});

const createManualEntrySchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  activityId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  date: z.string().min(1),
  durationMinutes: z.number().positive(),
  billable: z.boolean().default(true),
  hourlyRate: z.number().nonnegative().optional(),
});

const weeklyTimeCellSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalMinutes: z.number().int().min(0).max(24 * 60),
});

const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  tags: z.string().nullable().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  activityId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  manualMinutes: z.number().nullable().optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  status: z.enum(["draft", "approved", "invoiced"]).optional(),
});

const updateActiveTimerMetadataSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  activityId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  tags: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional().nullable(),
});

const stopTimerSchema = z.object({
  entryId: z.string().uuid(),
  // Optional: quick-stop may leave blank; fill later via timesheet edit.
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  activityId: z.string().uuid().optional().nullable(),
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
  const activityPolicy = await assertActivityWriteAllowed(db, {
    workspaceId: parsed.workspaceId,
    projectId: parsed.projectId,
    activityId: parsed.activityId,
    stage: "start",
  });

  const resolvedRate = await resolveHourlyRate({
    workspaceId: parsed.workspaceId,
    projectId: parsed.projectId,
    explicitRate: parsed.hourlyRate,
    projectActivityRate: activityPolicy.rateOverride,
    activityDefaultRate: activityPolicy.defaultHourlyRate,
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
      activityId: activityPolicy.activityId,
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
  const nextActivityId =
    parsed.activityId !== undefined ? parsed.activityId : entry.activityId;
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
  const activityPolicy = await assertActivityWriteAllowed(db, {
    workspaceId,
    projectId: nextProjectId,
    activityId: nextActivityId,
    stage: "completion",
  });

  const resolvedRate = await resolveHourlyRate({
    workspaceId,
    projectId: nextProjectId,
    explicitRate: parsed.hourlyRate,
    projectActivityRate: activityPolicy.rateOverride,
    activityDefaultRate: activityPolicy.defaultHourlyRate,
  });

  const [updated] = await db
    .update(timeEntries)
    .set({
      clientId: nextClientId,
      projectId: nextProjectId,
      activityId: activityPolicy.activityId,
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
  const activityPolicy = await assertActivityWriteAllowed(db, {
    workspaceId: parsed.workspaceId,
    projectId: parsed.projectId,
    activityId: parsed.activityId,
    stage: "manual",
  });
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

  // Resolve rate: explicit → Project Activity override → Activity default → Project → workspace.
  // Only auto-fill when project mode is billable.
  let resolvedRate: string | null = null;
  if (billable) {
    resolvedRate = await resolveHourlyRate({
      workspaceId: parsed.workspaceId,
      projectId: parsed.projectId,
      explicitRate: parsed.hourlyRate,
      projectActivityRate: activityPolicy.rateOverride,
      activityDefaultRate: activityPolicy.defaultHourlyRate,
    });
  }

  const [entry] = await db.insert(timeEntries).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId,
    activityId: activityPolicy.activityId,
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

export async function setWeeklyTimeCell(input: z.infer<typeof weeklyTimeCellSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = weeklyTimeCellSchema.parse(input);
  const [project] = await db.select({ clientId: projects.clientId }).from(projects)
    .where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project?.clientId) throw new Error("Project wajib punya klien");
  await assertTimeEntryContext(db, workspaceId, { clientId: project.clientId, projectId: parsed.projectId, taskId: parsed.taskId ?? null });
  const projectMode = await assertProjectTimeTrackingEnabled(db, workspaceId, parsed.projectId);
  const activityPolicy = await assertActivityWriteAllowed(db, { workspaceId, projectId: parsed.projectId, activityId: null, stage: "manual" });
  const start = new Date(`${parsed.date}T00:00:00.000Z`);
  const nextDay = new Date(start.getTime() + 86_400_000);

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(timeEntries).where(and(
      eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.userId, user.id),
      eq(timeEntries.projectId, parsed.projectId), parsed.taskId ? eq(timeEntries.taskId, parsed.taskId) : isNull(timeEntries.taskId),
      gte(timeEntries.startTime, start), lt(timeEntries.startTime, nextDay),
    ));
    const managed = rows.filter((row) => row.status === "draft" && row.manualMinutes != null && row.tags?.split(",").map((tag) => tag.trim()).includes(WEEKLY_GRID_TAG));
    const managedIds = new Set(managed.map((row) => row.id));
    const immutableMinutes = rows.filter((row) => !managedIds.has(row.id)).reduce((sum, row) => sum + Math.max(0, row.durationMinutes ?? row.manualMinutes ?? 0), 0);
    if (parsed.totalMinutes < immutableMinutes) throw new Error(`Minimum ${immutableMinutes} menit karena ada timer atau entri terkunci`);
    if (managed.length) await tx.delete(timeEntries).where(and(
      eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.userId, user.id), eq(timeEntries.status, "draft"),
      sql`${timeEntries.id} in (${sql.join(managed.map((row) => sql`${row.id}`), sql`, `)})`,
    ));
    const editableMinutes = parsed.totalMinutes - immutableMinutes;
    if (!editableMinutes) return { totalMinutes: immutableMinutes, immutableMinutes };
    const billable = timeEntryBillableForMode(projectMode);
    const hourlyRate = billable ? await resolveHourlyRate({ workspaceId, projectId: parsed.projectId, projectActivityRate: activityPolicy.rateOverride, activityDefaultRate: activityPolicy.defaultHourlyRate }) : null;
    const [created] = await tx.insert(timeEntries).values({
      workspaceId, clientId: project.clientId, projectId: parsed.projectId, activityId: activityPolicy.activityId,
      taskId: parsed.taskId ?? null, userId: user.id, description: "Weekly timesheet", tags: WEEKLY_GRID_TAG,
      startTime: start, endTime: new Date(start.getTime() + editableMinutes * 60_000), manualMinutes: editableMinutes,
      billable, hourlyRate, status: "draft",
    }).returning();
    return created;
  });
  await writeActivityLog(workspaceId, user.id, "updated_weekly_time_cell", "time_entry", "id" in result ? result.id : parsed.projectId);
  return result;
}

export async function updateActiveTimerMetadata(
  entryId: string,
  input: z.infer<typeof updateActiveTimerMetadataSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.workspaceId, workspaceId),
        isNull(timeEntries.endTime),
        isNull(timeEntries.manualMinutes),
      ),
    )
    .limit(1);

  if (!entry) throw new Error("Timer sudah selesai, edit lewat timesheet");
  if (entry.userId !== user.id) throw new Error("Timer milik user lain");
  if (!entry.startTime) throw new Error("Timer tidak valid");

  const parsed = updateActiveTimerMetadataSchema.parse(input);
  const nextClientId = parsed.clientId !== undefined ? parsed.clientId : entry.clientId;
  const nextProjectId = parsed.projectId !== undefined ? parsed.projectId : entry.projectId;
  const nextActivityId = parsed.activityId !== undefined ? parsed.activityId : entry.activityId;
  const nextTaskId = parsed.taskId !== undefined ? parsed.taskId : entry.taskId;

  await assertTimeEntryContext(db, workspaceId, {
    clientId: nextClientId,
    projectId: nextProjectId,
    taskId: nextTaskId,
  });

  const projectMode = nextProjectId
    ? await assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId)
    : null;
  const activityPolicy = await assertActivityWriteAllowed(db, {
    workspaceId,
    projectId: nextProjectId,
    activityId: nextActivityId,
    stage: "edit",
  });

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    clientId: nextClientId ?? null,
    projectId: nextProjectId ?? null,
    activityId: activityPolicy.activityId,
    taskId: nextTaskId ?? null,
    billable: projectMode ? timeEntryBillableForMode(projectMode) : false,
  };

  if (parsed.description !== undefined) updateData.description = parsed.description || null;
  if (parsed.tags !== undefined) updateData.tags = parsed.tags || null;
  if (parsed.hourlyRate !== undefined || nextProjectId !== entry.projectId || nextActivityId !== entry.activityId) {
    updateData.hourlyRate = projectMode
      ? await resolveHourlyRate({
          workspaceId,
          projectId: nextProjectId,
          explicitRate: parsed.hourlyRate === undefined
            ? entry.hourlyRate == null
              ? null
              : Number(entry.hourlyRate)
            : parsed.hourlyRate,
          projectActivityRate: activityPolicy.rateOverride,
          activityDefaultRate: activityPolicy.defaultHourlyRate,
        })
      : null;
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, entryId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_active_timer", "time_entry", entryId);
  return updated;
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
  const nextActivityId =
    parsed.activityId !== undefined ? parsed.activityId : entry.activityId;
  const nextTaskId = parsed.taskId !== undefined ? parsed.taskId : entry.taskId;
  await assertTimeEntryContext(db, workspaceId, {
    clientId: nextClientId,
    projectId: nextProjectId,
    taskId: nextTaskId,
  });
  if (!nextProjectId) throw new Error("Project wajib dipilih untuk entri waktu");
  const projectMode = await assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId);
  const activityPolicy = parsed.status === "approved"
    ? await assertActivityWriteAllowed(db, {
        workspaceId,
        projectId: nextProjectId,
        activityId: nextActivityId,
        stage: "approval",
      })
    : await assertActivityWriteAllowed(db, {
        workspaceId,
        projectId: nextProjectId,
        activityId: nextActivityId,
        stage: "edit",
      });
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.tags !== undefined) updateData.tags = parsed.tags;
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.projectId !== undefined) updateData.projectId = parsed.projectId;
  updateData.activityId = activityPolicy.activityId;
  if (parsed.taskId !== undefined) updateData.taskId = parsed.taskId;
  if (parsed.startTime !== undefined) updateData.startTime = parsed.startTime ? new Date(parsed.startTime) : null;
  if (parsed.endTime !== undefined) updateData.endTime = parsed.endTime ? new Date(parsed.endTime) : null;
  if (parsed.manualMinutes !== undefined) updateData.manualMinutes = parsed.manualMinutes;
  updateData.billable = timeEntryBillableForMode(projectMode);
  if (parsed.hourlyRate !== undefined || parsed.activityId !== undefined || parsed.projectId !== undefined) {
    updateData.hourlyRate = await resolveHourlyRate({
      workspaceId,
      projectId: nextProjectId,
      explicitRate: parsed.hourlyRate !== undefined
        ? parsed.hourlyRate
        : entry.hourlyRate == null
          ? null
          : Number(entry.hourlyRate),
      projectActivityRate: activityPolicy.rateOverride,
      activityDefaultRate: activityPolicy.defaultHourlyRate,
    });
  }
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
      activityId: timeEntries.activityId,
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
