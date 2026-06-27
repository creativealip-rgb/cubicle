"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, users } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { canInviteMember } from "@/lib/plan";

/**
 * Invite a user to the current workspace by email.
 * Only paid (team) plans can invite.
 */
export async function inviteMember(email: string, role: "member" | "viewer" = "member"): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Tidak terautentikasi" };

  const workspaceId = await getWorkspaceForCurrentUser();

  // Check plan
  const inviteCheck = await canInviteMember(workspaceId);
  if (!inviteCheck.allowed) return { ok: false, error: inviteCheck.reason };

  // Check inviter is owner or member
  const [inviterMembership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ))
    .limit(1);

  if (!inviterMembership || inviterMembership.role === "viewer") {
    return { ok: false, error: "Tidak punya akses untuk mengundang" };
  }

  // Find user by email
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!targetUser) {
    return { ok: false, error: "User dengan email ini belum terdaftar. Mereka perlu daftar dulu." };
  }

  // Check if already a member
  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, targetUser.id),
    ))
    .limit(1);

  if (existing) {
    return { ok: false, error: "User ini sudah jadi anggota workspace" };
  }

  // Add member
  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: targetUser.id,
    role,
  });

  return { ok: true };
}

/**
 * Remove a member from the current workspace.
 */
export async function removeMember(memberUserId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Tidak terautentikasi" };

  const workspaceId = await getWorkspaceForCurrentUser();

  // Check remover is owner
  const [removerMembership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ))
    .limit(1);

  if (!removerMembership || removerMembership.role !== "owner") {
    return { ok: false, error: "Hanya owner yang bisa menghapus anggota" };
  }

  // Can't remove yourself
  if (memberUserId === userId) {
    return { ok: false, error: "Tidak bisa menghapus diri sendiri" };
  }

  await db
    .delete(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, memberUserId),
    ));

  return { ok: true };
}

/**
 * List members of the current workspace.
 */
export async function getWorkspaceMembers(): Promise<Array<{
  id: string;
  name: string | null;
  email: string;
  role: string;
  isCurrentUser: boolean;
}>> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return [];

  const workspaceId = await getWorkspaceForCurrentUser();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.role, users.name);

  return rows.map(r => ({
    ...r,
    isCurrentUser: r.id === userId,
  }));
}
