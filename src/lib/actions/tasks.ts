"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, workspaces, users, workspaceMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertTaskInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyTaskAssigned } from "@/lib/notifications";
import { createNotification } from "@/lib/in-app-notifications";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
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
