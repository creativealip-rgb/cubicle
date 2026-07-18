"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaceMembers, users, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceOwner } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { canInviteMember } from "@/lib/plan";
import { notifyWorkspaceInvite } from "@/lib/notifications";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const roleSchema = z.enum(["owner", "member", "viewer"]);

const addMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema.default("member"),
});

export async function addWorkspaceMember(input: z.infer<typeof addMemberSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceOwner(db, user.id, workspaceId);

  const inviteCheck = await canInviteMember(user.id);
  if (!inviteCheck.allowed) {
    throw new Error(inviteCheck.reason || "Plan tidak mengizinkan undangan anggota.");
  }

  const parsed = addMemberSchema.parse(input);
  const email = parsed.email.toLowerCase().trim();

  // SessionUser only guarantees id/email — fetch display name from DB
  const [inviter] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const inviterName = inviter?.name || inviter?.email || user.email || "Workspace owner";

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const [workspace] = await db
    .select({ name: workspaces.name, replyToEmail: workspaces.replyToEmail })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://cubiqlo.com"
  ).replace(/\/$/, "");

  if (!targetUser) {
    // Pending invite path: email signup CTA. No membership row until they exist.
    const inviteUrl = `${appUrl}/signup?email=${encodeURIComponent(email)}&invite=1`;
    try {
      await notifyWorkspaceInvite({
        email,
        workspaceName: workspace?.name || "Cubiqlo",
        inviterName,
        inviteUrl,
        replyTo: workspace?.replyToEmail || undefined,
      });
    } catch (err) {
      console.error("[team] pending invite email failed", err);
    }
    await writeActivityLog(workspaceId, user.id, "invited_team_member_pending", "workspace", workspaceId, {
      email,
      role: parsed.role,
      status: "pending_signup",
    });
    revalidatePath("/app/settings");
    return {
      status: "pending_signup" as const,
      email,
      message:
        "User belum punya akun. Undangan email dikirim — minta mereka signup dulu, lalu tambahkan lagi.",
    };
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

  const inviteUrl = `${appUrl}/login?email=${encodeURIComponent(email)}`;
  try {
    await notifyWorkspaceInvite({
      email: targetUser.email,
      workspaceName: workspace?.name || "Cubiqlo",
      inviterName,
      inviteUrl,
      replyTo: workspace?.replyToEmail || undefined,
    });
  } catch (err) {
    console.error("[team] invite email failed", err);
  }

  await writeActivityLog(workspaceId, user.id, "added_team_member", "workspace_member", member.id, {
    email: targetUser.email,
    role: parsed.role,
  });

  revalidatePath("/app/settings");
  return {
    status: "added" as const,
    member,
    message: "Anggota ditambahkan. Email undangan dikirim.",
  };
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
