"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";

type WorkspaceRow = typeof workspaces.$inferSelect;

/**
 * Get workspace ID for the current authenticated user.
 * Auto-creates workspace if user has none (new signup).
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
 * Auto-creates workspace if user has none (new signup).
 */
export async function getWorkspaceFullForCurrentUser(): Promise<WorkspaceRow> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return getWorkspaceRecordForUser(userId);
}

/**
 * Get workspace record for a specific user by ID.
 * Auto-creates workspace if user has none.
 */
export async function getWorkspaceRecordForUser(userId: string): Promise<WorkspaceRow> {
  // Look up workspace via membership
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

  // No workspace found — auto-create for this user
  return createWorkspaceForUser(userId);
}

/**
 * Create a new workspace for a user and add them as owner.
 */
async function createWorkspaceForUser(userId: string): Promise<WorkspaceRow> {
  // Get user info for workspace name
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const baseName = user?.name || user?.email?.split("@")[0] || "My";
  const workspaceName = `${baseName}'s Workspace`;
  const slug = `ws-${userId.slice(0, 8)}`;

  const [ws] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      slug,
      ownerId: userId,
      defaultCurrency: "IDR",
      plan: "free",
    })
    .returning();

  // Add user as owner
  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId,
    role: "owner",
  });

  return ws;
}
