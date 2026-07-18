"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, workspaceMembers, projects } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertTaskInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyTaskAssigned } from "@/lib/notifications";
import { createNotification, notifyWorkspaceMembers } from "@/lib/in-app-notifications";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

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
  description: z.string().optional(),
  projectId: z.string().uuid("Valid project required"),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  clientVisible: z.boolean().default(false),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  clientVisible: z.boolean().optional(),
});

export async function createTask(input: z.infer<typeof taskSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = taskSchema.parse(input);

  // Get max position for the project+status
  const [maxPos] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)::int` })
    .from(tasks)
    .where(and(eq(tasks.projectId, parsed.projectId), eq(tasks.status, parsed.status)));

  const [task] = await db.insert(tasks).values({
    workspaceId,
    projectId: parsed.projectId,
    title: parsed.title,
    description: parsed.description || null,
    status: parsed.status,
    priority: parsed.priority,
    assigneeId: parsed.assigneeId || null,
    dueDate: parsed.dueDate || null,
    clientVisible: parsed.clientVisible,
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

  return task;
}

export async function updateTask(taskId: string, input: z.infer<typeof updateTaskSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  const parsed = updateTaskSchema.parse(input);

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
    .where(eq(tasks.id, taskId))
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
    .set({ status: status as any, position: pos, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
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

  return task;
}

export async function reorderTask(taskId: string, newPosition: number, newStatus?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  const updateData: Record<string, unknown> = { position: newPosition, updatedAt: new Date() };
  if (newStatus) updateData.status = newStatus;

  await db.update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId));

  return { success: true };
}

export async function assignTask(taskId: string, assigneeId: string | null) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

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

  return { success: true };
}

export async function deleteTask(taskId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertTaskInWorkspace(db, user.id, workspaceId, taskId);

  await db.delete(tasks).where(eq(tasks.id, taskId));
  await writeActivityLog(workspaceId, user.id, "deleted_task", "task", taskId);
  return { success: true };
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

  if (!row) throw new Error("Task not found");
  if (row.projectClientId !== client.id) throw new Error("Task not in your portal");
  if (!row.clientVisible) throw new Error("Task is not client-visible");
  if (row.status !== "review") throw new Error("Task is not awaiting review");

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
