import { and, eq, inArray } from "drizzle-orm";
import { db, type Db } from "@/db";
import { clients, projects, tasks, workspaceMembers } from "@/db/schema";

export type Role = "owner" | "member" | "viewer";

export type SessionUser = {
  id: string;
  email?: string | null;
};

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireUser(user: SessionUser | null | undefined): SessionUser {
  if (!user?.id) throw new UnauthorizedError();
  return user;
}

export async function assertWorkspaceMember(
  database: Db,
  userId: string,
  workspaceId: string,
  allowedRoles: Role[] = ["owner", "member", "viewer"],
) {
  const [member] = await database
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        inArray(workspaceMembers.role, allowedRoles),
      ),
    )
    .limit(1);

  if (!member) throw new ForbiddenError("Workspace access denied");
  return member;
}

export async function assertWorkspaceWritable(database: Db, userId: string, workspaceId: string) {
  return assertWorkspaceMember(database, userId, workspaceId, ["owner", "member"]);
}

export async function assertWorkspaceOwner(database: Db, userId: string, workspaceId: string) {
  return assertWorkspaceMember(database, userId, workspaceId, ["owner"]);
}

export async function assertClientInWorkspace(database: Db, userId: string, workspaceId: string, clientId: string) {
  await assertWorkspaceMember(database, userId, workspaceId);

  const [client] = await database
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .limit(1);

  if (!client) throw new ForbiddenError("Client access denied");
  return client;
}

export async function assertProjectInWorkspace(database: Db, userId: string, workspaceId: string, projectId: string) {
  await assertWorkspaceMember(database, userId, workspaceId);

  const [project] = await database
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);

  if (!project) throw new ForbiddenError("Project access denied");
  return project;
}

export async function assertTaskInWorkspace(database: Db, userId: string, workspaceId: string, taskId: string) {
  await assertWorkspaceMember(database, userId, workspaceId);

  const [task] = await database
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);

  if (!task) throw new ForbiddenError("Task access denied");
  return task;
}

export { db };
