"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, timeEntries, users, workspaceMembers, projects } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceWritable, assertTaskInWorkspace, assertProjectInWorkspace } from "@/lib/access";
import { assertWorkspaceUserReference } from "@/lib/tenant-reference-rules";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyTaskAssigned } from "@/lib/notifications";
import { createNotification, notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { resolveBillingModel } from "@/lib/billing-model";
import { resolveProjectTaskMode } from "@/lib/task-work-mode";
import { assertTaskModeMutationAllowed } from "@/lib/task-action-policies";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}
const taskStatusSchema = z.enum(["todo", "in_progress", "review", "done"]);

async function notifyIfAssigneeChanged(
  workspaceId: string,
  taskId: string,
  taskTitle: string,
  newAssigneeId: string | null,
  dueDate: string | null,
  assignerId: string,
) {
  if (!newAssigneeId || newAssigneeId === assignerId) return;

  const [assignee] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .where(and(eq(users.id, newAssigneeId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  if (!assignee?.email) return;

  const [assigner] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, assignerId))
    .limit(1);
  const assignerName = assigner?.name ?? assigner?.email ?? "Someone";

  try {
    await notifyTaskAssigned({
      assigneeEmail: assignee.email,
      assigneeName: assignee.name ?? assignee.email,
      taskTitle,
      taskId,
      assignerName,
      dueDate,
    });
  } catch {
    // best-effort email, don't fail the action
  }

  // In-app bell notification for assignee
  try {
    await createNotification({
      workspaceId,
      userId: newAssigneeId,
      type: "task_assigned",
      title: `${assignerName} assigned you: ${taskTitle}`,
      body: dueDate ? `Due ${dueDate}` : undefined,
      link: `/app/tasks?focus=${taskId}`,
      entityType: "task",
      entityId: taskId,
      actorId: assignerId,
    });
  } catch {
    // best-effort
  }
}

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  projectId: z.string().uuid("Valid project required"),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  clientVisible: z.boolean().optional(),
  mode: z.enum(["workflow", "reusable"]).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  clientVisible: z.boolean().optional(),
});

async function assertAssigneeInWorkspace(workspaceId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const [member] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, assigneeId)))
    .limit(1);
  assertWorkspaceUserReference(member, assigneeId);
}

export async function createTask(input: z.infer<typeof taskSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = taskSchema.parse(input);
  await assertProjectInWorkspace(db, user.id, workspaceId, parsed.projectId);
  await assertAssigneeInWorkspace(workspaceId, parsed.assigneeId);
  const [project] = await db.select({
    billingModel: projects.billingModel,
    billingType: projects.billingType,
    taskModePolicy: projects.taskModePolicy,
  }).from(projects).where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project) throw new Error("Project tidak ditemukan");
  const projectMode = resolveProjectTaskMode(project.taskModePolicy, resolveBillingModel(project), parsed.mode);
  assertTaskModeMutationAllowed(projectMode, parsed);

  // Get max position for the project+status
  const [maxPos] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)::int` })
    .from(tasks)
    .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, parsed.projectId), eq(tasks.mode, projectMode)));

  const [task] = await db.insert(tasks).values({
    workspaceId,
    projectId: parsed.projectId,
    mode: projectMode,
    lifecycle: "active",
    behavior: projectMode === "workflow" ? "one_time" : "recurring",
    title: parsed.title,
    description: parsed.description || null,
    status: parsed.status ?? "todo",
    priority: parsed.priority ?? "medium",
    assigneeId: parsed.assigneeId || null,
    dueDate: parsed.dueDate || null,
    clientVisible: parsed.clientVisible ?? false,
    position: (maxPos?.max ?? -1) + 1,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(workspaceId, user.id, "created_task", "task", task.id);

  await notifyIfAssigneeChanged(
    workspaceId,
    task.id,
    task.title,
    task.assigneeId,
    task.dueDate,
    user.id,
  );

  revalidatePath("/app/tasks");
  return task;
}

export async function updateTask(taskId: string, input: z.infer<typeof updateTaskSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  const parsed = updateTaskSchema.parse(input);
  const [currentTask] = await db.select().from(tasks).where(and(
    eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId),
  )).limit(1);
  if (!currentTask) throw new Error("Task tidak ditemukan");
  assertTaskModeMutationAllowed(currentTask.mode, parsed);
  if (parsed.assigneeId !== undefined) {
    await assertAssigneeInWorkspace(workspaceId, parsed.assigneeId);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) updateData.title = parsed.title;
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.status !== undefined) updateData.status = parsed.status as "todo" | "in_progress" | "review" | "done";
  if (parsed.priority !== undefined) updateData.priority = parsed.priority as "low" | "medium" | "high" | "urgent";
  if (parsed.assigneeId !== undefined) updateData.assigneeId = parsed.assigneeId;
  if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate;
  if (parsed.clientVisible !== undefined) updateData.clientVisible = parsed.clientVisible;

  const [task] = await db.update(tasks)
    .set(updateData as typeof tasks.$inferInsert)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_task", "task", taskId);

  if (parsed.assigneeId !== undefined) {
    await notifyIfAssigneeChanged(
      workspaceId,
      task.id,
      task.title,
      parsed.assigneeId,
      task.dueDate,
      user.id,
    );
  }

  revalidatePath("/app/tasks");
  return task;
}

export async function updateTaskStatus(taskId: string, status: string, position?: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  const pos = position ?? 0;

  const [task] = await db.update(tasks)
    .set({ status: taskStatusSchema.parse(status), position: pos, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_task_status", "task", taskId);

  if (task.assigneeId && task.assigneeId !== user.id) {
    try {
      await createNotification({
        workspaceId,
        userId: task.assigneeId,
        type: "task_status_changed",
        title: `Task moved to ${status.replace(/_/g, " ")}`,
        body: task.title,
        link: `/app/tasks?focus=${taskId}`,
        entityType: "task",
        entityId: taskId,
        actorId: user.id,
      });
    } catch {
      // best-effort
    }
  }

  revalidatePath("/app/tasks");
  return task;
}

export async function reorderTask(taskId: string, newPosition: number, newStatus?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  const updateData: Record<string, unknown> = { position: newPosition, updatedAt: new Date() };
  if (newStatus) updateData.status = taskStatusSchema.parse(newStatus);

  await db.update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)));

  return { success: true };
}

export async function reorderProjectTasks(projectId: string, mode: "workflow" | "reusable", orderedTaskIds: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
  const rows = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, projectId), eq(tasks.mode, mode), eq(tasks.lifecycle, "active")));
  const existing = rows.map((row) => row.id).sort();
  const requested = [...new Set(orderedTaskIds)].sort();
  if (existing.length !== requested.length || existing.some((id, index) => id !== requested[index])) throw new Error("Daftar Task tidak lengkap");
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ position: sql`${tasks.position} + 1000000` }).where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, projectId), eq(tasks.mode, mode), inArray(tasks.id, orderedTaskIds)));
    for (const [position, id] of orderedTaskIds.entries()) await tx.update(tasks).set({ position, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)));
  });
  return { success: true };
}

export async function assignTask(taskId: string, assigneeId: string | null) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);
  await assertAssigneeInWorkspace(workspaceId, assigneeId);

  const [task] = await db.update(tasks)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "assigned_task", "task", taskId);

  await notifyIfAssigneeChanged(
    workspaceId,
    task.id,
    task.title,
    assigneeId,
    task.dueDate,
    user.id,
  );

  revalidatePath("/app/tasks");
  return { success: true };
}

export async function archiveTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);
  const [task] = await db.update(tasks).set({ lifecycle: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(and(
    eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId),
  )).returning();
  revalidatePath("/app/tasks");
  return task;
}

export async function restoreTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);
  const [task] = await db.update(tasks).set({ lifecycle: "active", archivedAt: null, updatedAt: new Date() }).where(and(
    eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId),
  )).returning();
  revalidatePath("/app/tasks");
  return task;
}

export async function deleteTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);
  const [reference] = await db.select({ id: timeEntries.id }).from(timeEntries).where(and(
    eq(timeEntries.taskId, taskId), eq(timeEntries.workspaceId, workspaceId),
  )).limit(1);
  if (reference) throw new Error("TASK_REFERENCED_BY_TIME: Task dengan Time Log harus diarsipkan");
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)));
  await writeActivityLog(workspaceId, user.id, "deleted_task", "task", taskId);
  revalidatePath("/app/tasks");
  return { success: true };
}

export async function permanentlyDeleteTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM comments WHERE workspace_id=${workspaceId} AND entity_type='task' AND entity_id=${taskId}`);
    await tx.execute(sql`DELETE FROM notifications WHERE workspace_id=${workspaceId} AND entity_type='task' AND entity_id=${taskId}`);
    await tx.delete(timeEntries).where(and(eq(timeEntries.taskId, taskId), eq(timeEntries.workspaceId, workspaceId)));
    const [deleted] = await tx.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId))).returning({ id: tasks.id });
    if (!deleted) throw new Error("Task tidak ditemukan");
    return { success: true };
  });
  revalidatePath("/app/tasks");
  return result;
}

const respondPortalTaskSchema = z.object({
  token: z.string().min(1),
  taskId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
});

/**
 * Client portal: approve / request changes on a client-visible task in `review`.
 * Approved → done. Rejected (minta revisi) → in_progress + optional note.
 */
export async function respondPortalTask(input: z.infer<typeof respondPortalTaskSchema>) {
  const parsed = respondPortalTaskSchema.parse(input);
  const { getClientPortalAccess } = await import("@/lib/actions/portal");
  const client = await getClientPortalAccess(parsed.token);

  const [row] = await db
    .select({
      id: tasks.id,
      mode: tasks.mode,
      title: tasks.title,
      status: tasks.status,
      description: tasks.description,
      clientVisible: tasks.clientVisible,
      projectId: tasks.projectId,
      workspaceId: tasks.workspaceId,
      assigneeId: tasks.assigneeId,
      projectClientId: projects.clientId,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        eq(tasks.id, parsed.taskId),
        eq(tasks.workspaceId, client.workspaceId),
      ),
    )
    .limit(1);

  if (!row) throw new Error("Task tidak ditemukan");
  if (row.mode !== "workflow") throw new Error("Hanya task mode workflow yang mendukung portal review");
  if (row.projectClientId !== client.id) throw new Error("Task tidak ada di portal Anda");
  if (!row.clientVisible) throw new Error("Task tidak ditampilkan ke klien");
  if (row.status !== "review") throw new Error("Task tidak sedang menunggu review");

  const nextStatus = parsed.decision === "approved" ? "done" : "in_progress";
  const stamp = new Date().toISOString();
  const decisionLabel = parsed.decision === "approved" ? "APPROVED" : "REVISION_REQUESTED";
  const noteLine = parsed.note?.trim() ? `\nClient note: ${parsed.note.trim()}` : "";
  const trailer = `\n\n---\n[Client ${decisionLabel} @ ${stamp}]${noteLine}`;
  const nextDescription = `${row.description || ""}${trailer}`.slice(0, 8000);

  const [task] = await db
    .update(tasks)
    .set({
      status: nextStatus,
      description: nextDescription,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, parsed.taskId))
    .returning();

  await writeActivityLog(
    client.workspaceId,
    null,
    parsed.decision === "approved" ? "client_approved_task" : "client_requested_task_revision",
    "task",
    task.id,
    {
      decision: parsed.decision,
      fromStatus: "review",
      toStatus: nextStatus,
      clientId: client.id,
      clientName: client.name,
      note: parsed.note?.trim() || null,
    },
  );

  try {
    const title =
      parsed.decision === "approved"
        ? `${client.name} menyetujui: ${task.title}`
        : `${client.name} minta revisi: ${task.title}`;
    const body =
      parsed.note?.trim() ||
      (parsed.decision === "approved"
        ? "Task disetujui lewat client portal"
        : "Client minta revisi lewat client portal");
    await notifyWorkspaceMembers(client.workspaceId, {
      type: parsed.decision === "approved" ? "client_task_approved" : "client_task_revision",
      title,
      body,
      link: `/app/tasks?focus=${task.id}`,
      entityType: "task",
      entityId: task.id,
      actorId: null,
    });
  } catch {
    // best-effort
  }

  return {
    id: task.id,
    status: task.status,
    description: task.description,
    decision: parsed.decision,
  };
}
