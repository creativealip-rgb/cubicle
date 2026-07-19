"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, projectMembers, tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertProjectInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  clientId: z.string().uuid("Valid client required"),
  status: z.enum(["draft", "active", "on_hold", "completed", "cancelled", "archived"]).default("active"),
  billingType: z.enum(["project", "hours", "package"]).default("project"),
  currency: z.string().default("IDR"),
  rate: z.number().optional(),
  budget: z.number().optional(),
  startDate: z.string().optional(),
  finishDate: z.string().optional(),
  dueDate: z.string().optional(),
  clientVisible: z.boolean().default(false),
  selectedPackageId: z.string().uuid().optional(),
});

export async function createProject(input: z.infer<typeof projectSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  // Check plan limits (plan is per-user, not per-workspace)
  const { getUserPlan, checkEntityLimit } = await import("@/lib/plan");
  const plan = await getUserPlan(user.id);
  const projLimit = await checkEntityLimit(workspaceId, "projects", plan);
  if (!projLimit.allowed) {
    // Soft-fail so production doesn't hide the message behind a Next digest.
    return {
      ok: false as const,
      code: "PLAN_LIMIT" as const,
      error: projLimit.reason ?? "Plan limit reached",
      current: projLimit.current,
      limit: projLimit.limit,
    };
  }

  const parsed = projectSchema.parse(input);

  const [project] = await db.insert(projects).values({
    workspaceId,
    clientId: parsed.clientId,
    name: parsed.name,
    description: parsed.description || null,
    status: parsed.status,
    billingType: parsed.billingType,
    currency: parsed.currency,
    rate: parsed.rate ? String(parsed.rate) : null,
    budget: parsed.budget ? String(parsed.budget) : null,
    startDate: parsed.startDate || null,
    finishDate: parsed.finishDate || null,
    dueDate: parsed.dueDate || null,
    clientVisible: parsed.clientVisible,
    selectedPackageId: parsed.selectedPackageId || null,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(workspaceId, user.id, "created_project", "project", project.id);
  return { ok: true as const, project };
}

export async function updateProject(projectId: string, input: Partial<z.infer<typeof projectSchema>>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const parsed = projectSchema.partial().parse(input);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.status !== undefined) updateData.status = parsed.status;
  if (parsed.billingType !== undefined) updateData.billingType = parsed.billingType;
  if (parsed.currency !== undefined) updateData.currency = parsed.currency;
  if (parsed.rate !== undefined) updateData.rate = parsed.rate ? String(parsed.rate) : null;
  if (parsed.budget !== undefined) updateData.budget = parsed.budget ? String(parsed.budget) : null;
  if (parsed.startDate !== undefined) updateData.startDate = parsed.startDate || null;
  if (parsed.finishDate !== undefined) updateData.finishDate = parsed.finishDate || null;
  if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate;
  if (parsed.clientVisible !== undefined) updateData.clientVisible = parsed.clientVisible;
  if (parsed.selectedPackageId !== undefined) updateData.selectedPackageId = parsed.selectedPackageId || null;

  const [project] = await db.update(projects)
    .set(updateData)
    .where(eq(projects.id, projectId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_project", "project", projectId);
  return project;
}

export async function archiveProject(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const [project] = await db.update(projects)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "archived_project", "project", projectId);
  return project;
}

export async function setProjectVisibility(projectId: string, clientVisible: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const [project] = await db.update(projects)
    .set({ clientVisible, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_project_visibility", "project", projectId);
  return project;
}

export async function addProjectMember(projectId: string, userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const [member] = await db.insert(projectMembers).values({
    projectId,
    userId,
  }).returning();

  await writeActivityLog(workspaceId, user.id, "added_project_member", "project", projectId);
  return member;
}

export async function removeProjectMember(projectId: string, userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  await db.delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

  await writeActivityLog(workspaceId, user.id, "removed_project_member", "project", projectId);
  return { success: true };
}

export async function getProjectProgress(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertProjectInWorkspace(db, user.id, workspaceId, projectId);

  const result = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const { total, done } = result[0] ?? { total: 0, done: 0 };
  return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}
