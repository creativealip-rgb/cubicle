"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";

const COOKIE_NAME = "active_workspace_id";

type WorkspaceRow = typeof workspaces.$inferSelect;

/**
 * Get workspace ID for the current authenticated user.
 * Checks cookie first, then membership, auto-creates if none.
 */
export async function getWorkspaceForCurrentUser(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const ws = await getWorkspaceRecordForUser(userId);
  return ws.id;
}

/**
 * Get full workspace record for the current user.
 */
export async function getWorkspaceFullForCurrentUser(): Promise<WorkspaceRow> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return getWorkspaceRecordForUser(userId);
}

/**
 * Get workspace record for a specific user by ID.
 * Priority: cookie → first membership → auto-create.
 */
export async function getWorkspaceRecordForUser(userId: string): Promise<WorkspaceRow> {
  const cookieStore = await cookies();
  const cookieWsId = cookieStore.get(COOKIE_NAME)?.value;

  // If cookie exists, verify membership
  if (cookieWsId) {
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, cookieWsId),
      ))
      .limit(1);

    if (membership) {
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, membership.workspaceId))
        .limit(1);
      if (ws) return ws;
    }
    // Cookie invalid — fall through to default
  }

  // Fallback: first membership
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (membership) {
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, membership.workspaceId))
      .limit(1);
    if (ws) return ws;
  }

  // No workspace found — auto-create
  return createWorkspaceForUser(userId);
}

/**
 * Create a new workspace for a user and add them as owner.
 */
async function createWorkspaceForUser(userId: string): Promise<WorkspaceRow> {
  const [existingOwnedWorkspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1);

  if (existingOwnedWorkspace) {
    await ensureWorkspaceMembership(existingOwnedWorkspace.id, userId);
    return existingOwnedWorkspace;
  }

  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const baseName = user?.name || user?.email?.split("@")[0] || "My";
  const workspaceName = `${baseName}'s Workspace`;
  const slug = `ws-${userId.slice(0, 8)}`;

  const insertedWorkspaces = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      slug,
      ownerId: userId,
      defaultCurrency: "IDR",
      plan: "free",
    })
    .onConflictDoNothing({ target: workspaces.slug })
    .returning();

  const ws = insertedWorkspaces[0] ?? (await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1))[0];

  if (!ws) throw new Error("Failed to create workspace");

  await ensureWorkspaceMembership(ws.id, userId);
  return ws;
}

async function ensureWorkspaceMembership(workspaceId: string, userId: string) {
  await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId,
      role: "owner",
    })
    .onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
    });
}
