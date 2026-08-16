"use server";

import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@better-auth/utils/password";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import {
  accounts,
  adminAuditLogs,
  clients,
  invoices,
  pakasirPayments,
  projects,
  sessions,
  users as usersTable,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { requireAdmin, writeAdminAudit } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import {
  banUserSchema,
  changeUserPlanSchema,
  createUserSchema,
  listUsersSchema,
  resetUserPasswordSchema,
  unbanUserSchema,
  updateUserSchema,
} from "@/lib/admin-schemas";
import type { AdminActionResult, AdminListUserRow } from "@/lib/admin-schemas";

const PAGE_SIZE = 25;

export async function listUsers(input: z.infer<typeof listUsersSchema>) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:list-users", admin.id, { limit: 120, windowSec: 60 });
  const parsed = listUsersSchema.parse(input);

  const conditions = [];
  if (parsed.search) {
    const q = `%${parsed.search.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(usersTable.name, q),
        ilike(usersTable.email, q),
      ),
    );
  }
  if (parsed.plan) conditions.push(eq(usersTable.plan, parsed.plan));
  if (parsed.banned !== undefined) conditions.push(eq(usersTable.banned, parsed.banned));
  if (parsed.verified !== undefined) conditions.push(eq(usersTable.emailVerified, parsed.verified));
  if (parsed.role) conditions.push(eq(usersTable.role, parsed.role));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(where);

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      role: usersTable.role,
      banned: usersTable.banned,
      plan: usersTable.plan,
      planExpiresAt: usersTable.planExpiresAt,
      createdAt: usersTable.createdAt,
      workspaceCount: sql<number>`(
        SELECT count(*)::int FROM workspace_members wm WHERE wm.user_id = ${usersTable.id}
      )`,
    })
    .from(usersTable)
    .where(where)
    .orderBy(desc(usersTable.createdAt))
    .limit(PAGE_SIZE)
    .offset((parsed.page - 1) * PAGE_SIZE);

  return {
    users: rows as unknown as AdminListUserRow[],
    total,
    page: parsed.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ─── Silent provisioning ───
//
// Mirrors scripts/seed-qa-manual.mjs: insert the users row + a 'credential'
// accounts row with a hashPassword hash, set emailVerified directly, and
// NEVER send a verification email. Deliberately NOT auth.api.signUpEmail —
// with requireEmailVerification:true that path fires the verification email
// even for admin-created accounts.

export async function createUser(input: z.infer<typeof createUserSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:create-user", admin.id, { limit: 30, windowSec: 60 });

  const parsed = createUserSchema.parse(input);
  const email = parsed.email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing) return { ok: false, error: "A user with this email already exists." };

  try {
    const id = randomBytes(16).toString("base64url"); // better-auth style text id
    const passwordHash = await hashPassword(parsed.password);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(usersTable).values({
        id,
        name: parsed.name,
        email,
        emailVerified: parsed.verified,
        plan: parsed.plan,
        createdAt: now,
        updatedAt: now,
        role: "user",
      });
      await tx.insert(accounts).values({
        id: randomBytes(16).toString("base64url"),
        accountId: id, // seed script pattern: accountId = user.id
        providerId: "credential",
        userId: id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    });

    await writeAdminAudit(admin.id, "user.create", {
      targetUserId: id,
      metadata: {
        email,
        plan: parsed.plan,
        emailVerified: parsed.verified,
      },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create user." };
  }
}

// ─── Edit ───

export async function updateUser(input: z.infer<typeof updateUserSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:update-user", admin.id, { limit: 60, windowSec: 60 });

  const parsed = updateUserSchema.parse(input);
  if (parsed.userId === admin.id) return { ok: false, error: "You cannot edit your own account." };

  const [target] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, emailVerified: usersTable.emailVerified })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId))
    .limit(1);
  if (!target) return { ok: false, error: "User not found." };

  const email = parsed.email.toLowerCase().trim();
  const [dup] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.email, email), ne(usersTable.id, parsed.userId)))
    .limit(1);
  if (dup) return { ok: false, error: "Another user already uses this email." };

  await db
    .update(usersTable)
    .set({ name: parsed.name, email, emailVerified: parsed.emailVerified, updatedAt: new Date() })
    .where(eq(usersTable.id, parsed.userId));

  await writeAdminAudit(admin.id, "user.update", {
    targetUserId: parsed.userId,
    metadata: {
      before: { name: target.name, email: target.email, emailVerified: target.emailVerified },
      after: { name: parsed.name, email, emailVerified: parsed.emailVerified },
    },
  });

  revalidatePath(`/admin/users/${parsed.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

// ─── Reset password ───

export async function resetUserPassword(input: z.infer<typeof resetUserPasswordSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:reset-password", admin.id, { limit: 30, windowSec: 60 });

  const parsed = resetUserPasswordSchema.parse(input);
  if (parsed.userId === admin.id) return { ok: false, error: "You cannot reset your own password." };

  const [credential] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, parsed.userId), eq(accounts.providerId, "credential")))
    .limit(1);
  if (!credential) return { ok: false, error: "This user has no password credential." };

  const passwordHash = await hashPassword(parsed.newPassword);
  await db
    .update(accounts)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(eq(accounts.id, credential.id));

  await writeAdminAudit(admin.id, "user.password_reset", {
    targetUserId: parsed.userId,
  });

  return { ok: true };
}

// ─── Ban / unban ───

export async function banUser(input: z.infer<typeof banUserSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:ban-user", admin.id, { limit: 30, windowSec: 60 });

  const parsed = banUserSchema.parse(input);
  if (parsed.userId === admin.id) return { ok: false, error: "You cannot ban your own account." };

  const [target] = await db
    .select({ id: usersTable.id, banned: usersTable.banned })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId))
    .limit(1);
  if (!target) return { ok: false, error: "User not found." };
  if (target.banned) return { ok: false, error: "User is already banned." };

  const reason = parsed.reason || null;
  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ banned: true, bannedAt: new Date(), bannedReason: reason, updatedAt: new Date() })
      .where(eq(usersTable.id, parsed.userId));
    // Revoke ALL active sessions — banned users are logged out everywhere
    // immediately (sessions.userId FK is ON DELETE CASCADE, so direct DELETE
    // is safe and has no side effects on other tables).
    await tx.delete(sessions).where(eq(sessions.userId, parsed.userId));
  });

  await writeAdminAudit(admin.id, "user.ban", {
    targetUserId: parsed.userId,
    metadata: { reason: reason ?? "" },
  });

  revalidatePath(`/admin/users/${parsed.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function unbanUser(input: z.infer<typeof unbanUserSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:unban-user", admin.id, { limit: 30, windowSec: 60 });

  const parsed = unbanUserSchema.parse(input);

  const [target] = await db
    .select({ id: usersTable.id, banned: usersTable.banned })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId))
    .limit(1);
  if (!target) return { ok: false, error: "User not found." };
  if (!target.banned) return { ok: false, error: "User is not banned." };

  await db
    .update(usersTable)
    .set({ banned: false, bannedAt: null, bannedReason: null, updatedAt: new Date() })
    .where(eq(usersTable.id, parsed.userId));

  await writeAdminAudit(admin.id, "user.unban", {
    targetUserId: parsed.userId,
  });

  revalidatePath(`/admin/users/${parsed.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

// ─── Plan change (direct, per locked decision #4) ───

export async function changeUserPlan(input: z.infer<typeof changeUserPlanSchema>): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:change-plan", admin.id, { limit: 30, windowSec: 60 });

  const parsed = changeUserPlanSchema.parse(input);
  if (parsed.userId === admin.id) return { ok: false, error: "You cannot change your own plan." };

  const [target] = await db
    .select({ id: usersTable.id, plan: usersTable.plan, planExpiresAt: usersTable.planExpiresAt })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId))
    .limit(1);
  if (!target) return { ok: false, error: "User not found." };

  const expiresAt = parsed.planExpiresAt ? new Date(parsed.planExpiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { ok: false, error: "Invalid plan expiry date." };
  }

  await db
    .update(usersTable)
    .set({ plan: parsed.plan, planExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(usersTable.id, parsed.userId));

  // Audit MUST record old → new + reason (locked decision #4).
  await writeAdminAudit(admin.id, "user.plan_change", {
    targetUserId: parsed.userId,
    metadata: {
      from: { plan: target.plan, planExpiresAt: target.planExpiresAt?.toISOString() ?? null },
      to: { plan: parsed.plan, planExpiresAt: expiresAt?.toISOString() ?? null },
      reason: parsed.reason,
    },
  });

  revalidatePath(`/admin/users/${parsed.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

// ─── Detail ───

export async function getUserDetail(userId: string) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:user-detail", admin.id, { limit: 120, windowSec: 60 });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return null;

  const [memberRows, workspaceRows, sessionRows, paymentRows, statsRow] = await Promise.all([
    db
      .select({
        workspaceId: workspaceMembers.workspaceId,
        workspaceName: workspaces.name,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .leftJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(desc(workspaces.createdAt)),
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId))
      .orderBy(desc(workspaces.createdAt)),
    db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(20),
    db
      .select({
        id: pakasirPayments.id,
        orderId: pakasirPayments.orderId,
        workspaceId: pakasirPayments.workspaceId,
        plan: pakasirPayments.plan,
        billingPeriod: pakasirPayments.billingPeriod,
        paymentType: pakasirPayments.paymentType,
        amount: pakasirPayments.amount,
        status: pakasirPayments.status,
        paidAt: pakasirPayments.paidAt,
        createdAt: pakasirPayments.createdAt,
      })
      .from(pakasirPayments)
      .innerJoin(workspaces, eq(workspaces.id, pakasirPayments.workspaceId))
      .where(eq(workspaces.ownerId, userId))
      .orderBy(desc(pakasirPayments.createdAt))
      .limit(50),
    db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM clients c JOIN workspaces w ON w.id = c.workspace_id WHERE w.owner_id = ${userId}) AS client_count,
        (SELECT count(*)::int FROM projects p JOIN workspaces w ON w.id = p.workspace_id WHERE w.owner_id = ${userId}) AS project_count,
        (SELECT count(*)::int FROM invoices i JOIN workspaces w ON w.id = i.workspace_id WHERE w.owner_id = ${userId}) AS invoice_count
    `),
  ]);

  const counts = statsRow.rows[0] as { client_count: number; project_count: number; invoice_count: number } | undefined;

  return {
    user,
    memberships: memberRows,
    ownedWorkspaces: workspaceRows,
    sessions: sessionRows,
    payments: paymentRows,
    stats: {
      clients: counts?.client_count ?? 0,
      projects: counts?.project_count ?? 0,
      invoices: counts?.invoice_count ?? 0,
    },
  };
}
