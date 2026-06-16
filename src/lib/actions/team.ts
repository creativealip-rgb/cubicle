"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";
import { assertWorkspaceOwner, requireUser } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

const roleSchema = z.enum(["member", "viewer"]);

const addMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema.default("member"),
});

export async function addWorkspaceMember(input: z.infer<typeof addMemberSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceOwner(db, user.id, workspaceId);

  const parsed = addMemberSchema.parse(input);
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.email.toLowerCase()))
    .limit(1);

  if (!targetUser) {
    throw new Error("User belum ada. Suruh signup dulu, lalu add ke team.");
  }

  const [existing] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUser.id)))
    .limit(1);

  if (existing) {
    throw new Error("User sudah jadi member workspace ini.");
  }

  const [member] = await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId: targetUser.id, role: parsed.role })
    .returning();

  await writeActivityLog(workspaceId, user.id, "added_team_member", "workspace_member", member.id, {
    email: targetUser.email,
    role: parsed.role,
  });

  revalidatePath("/app/settings");
  return member;
}

const updateRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: roleSchema,
});

export async function updateWorkspaceMemberRole(input: z.infer<typeof updateRoleSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceOwner(db, user.id, workspaceId);

  const parsed = updateRoleSchema.parse(input);

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, parsed.memberId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  if (!member) throw new Error("Member not found");
  if (member.role === "owner") throw new Error("Owner role tidak bisa diubah di MVP.");

  const [updated] = await db
    .update(workspaceMembers)
    .set({ role: parsed.role })
    .where(eq(workspaceMembers.id, parsed.memberId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_team_role", "workspace_member", parsed.memberId, {
    role: parsed.role,
  });

  revalidatePath("/app/settings");
  return updated;
}

export async function removeWorkspaceMember(memberId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceOwner(db, user.id, workspaceId);

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  if (!member) throw new Error("Member not found");
  if (member.role === "owner") throw new Error("Owner tidak bisa di-remove di MVP.");

  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));
  await writeActivityLog(workspaceId, user.id, "removed_team_member", "workspace_member", memberId);

  revalidatePath("/app/settings");
  return { success: true };
}
