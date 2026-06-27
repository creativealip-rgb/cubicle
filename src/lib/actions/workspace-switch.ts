"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";

const COOKIE_NAME = "active_workspace_id";

/**
 * Switch the active workspace for the current user.
 * Validates membership before switching.
 */
export async function switchWorkspace(workspaceId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Tidak terautentikasi" };

  // Verify membership
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
    ))
    .limit(1);

  if (!membership) return { ok: false, error: "Bukan anggota workspace ini" };

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return { ok: true };
}

/**
 * Get all workspaces the current user belongs to.
 */
export async function getUserWorkspaces(): Promise<Array<{
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}>> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);

  // Get active workspace ID from cookie
  const cookieStore = await cookies();
  const activeId = cookieStore.get(COOKIE_NAME)?.value;

  // If cookie points to a workspace user is not a member of, clear it
  const validIds = new Set(rows.map(r => r.id));
  const activeWorkspaceId = activeId && validIds.has(activeId) ? activeId : rows[0]?.id;

  return rows.map(r => ({
    ...r,
    isActive: r.id === activeWorkspaceId,
  }));
}
