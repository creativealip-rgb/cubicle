"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { canCreateWorkspace, getPlanLimits, getUserPlan } from "@/lib/plan";

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

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

/**
 * Get all workspaces the current user belongs to + plan info.
 */
export async function getUserWorkspaces(): Promise<{
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isActive: boolean;
  }>;
  plan: string;
  canCreate: boolean;
  canCreateReason?: string;
  canInvite: boolean;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { workspaces: [], plan: "free", canCreate: false, canInvite: false };

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

  const currentPlan = await getUserPlan(userId);
  const cookieStore = await cookies();
  const activeId = cookieStore.get(COOKIE_NAME)?.value;
  const validIds = new Set(rows.map(r => r.id));
  const activeWorkspaceId = activeId && validIds.has(activeId) ? activeId : rows[0]?.id;

  const createCheck = await canCreateWorkspace(userId);
  const limits = getPlanLimits(currentPlan);

  return {
    workspaces: rows.map(r => ({
      ...r,
      isActive: r.id === activeWorkspaceId,
    })),
    plan: currentPlan,
    canCreate: createCheck.allowed,
    canCreateReason: createCheck.reason,
    canInvite: limits.canInviteMembers,
  };
}

/**
 * Create a new workspace (paid only).
 */
export async function createWorkspace(name: string): Promise<{ ok: boolean; error?: string; workspaceId?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Tidak terautentikasi" };

  const check = await canCreateWorkspace(userId);
  if (!check.allowed) return { ok: false, error: check.reason };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + userId.slice(0, 4);

  const [ws] = await db
    .insert(workspaces)
    .values({
      name,
      slug,
      ownerId: userId,
      defaultCurrency: "IDR",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId,
    role: "owner",
  });

  // Auto-switch to new workspace
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, ws.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, workspaceId: ws.id };
}
