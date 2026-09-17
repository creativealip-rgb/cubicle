"use server";

import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, adminAuditLogs, authRecoveryHandoffs, mfaRecoveryApprovals, mfaRecoveryRequests, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { verifyPassword } from "@better-auth/utils/password";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { canExecuteRecovery, recoveryCoolingUntil } from "@/lib/mfa/manual-recovery-policy";
import { sendNotification } from "@/lib/notifications";
import { generateToken, hashVerifier } from "@/lib/auth-login/crypto";

const decisionSchema = z.object({ requestId: z.string().uuid(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).optional() });
const requestSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(200), reason: z.string().trim().min(20).max(1000) });
const listSchema = z.object({ status: z.enum(["all", "pending", "cooling", "ready", "executed", "rejected"]).default("all"), search: z.string().trim().max(120).default(""), page: z.coerce.number().int().min(1).default(1) });

export async function requestMfaRecovery(input: z.infer<typeof requestSchema>) {
  const { email, password, reason } = requestSchema.parse(input); await enforceServerActionRateLimit("user:mfa-recovery", email, { limit: 3, windowSec: 86400 });
  const [user] = await db.select({ id: users.id, email: users.email, password: accounts.password }).from(users).innerJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential"))).where(eq(users.email, email)).limit(1);
  if (!user?.password || !(await verifyPassword(user.password, password))) throw new Error("Unable to create recovery request");
  const [existing] = await db.select({ id: mfaRecoveryRequests.id }).from(mfaRecoveryRequests).where(and(eq(mfaRecoveryRequests.userId, user.id), eq(mfaRecoveryRequests.status, "pending"))).limit(1); if (existing) return { ok: true, requestId: existing.id };
  const createdAt = new Date(); const [request] = await db.insert(mfaRecoveryRequests).values({ userId: user.id, reason, coolingUntil: recoveryCoolingUntil(createdAt), evidence: { source: "authenticated-session" }, createdAt, updatedAt: createdAt }).returning({ id: mfaRecoveryRequests.id, coolingUntil: mfaRecoveryRequests.coolingUntil });
  if (user.email) await sendNotification({ to: user.email, subject: "Cubiqlo MFA recovery requested", text: `A manual MFA recovery was requested. No account change can happen before ${request.coolingUntil.toISOString()} and two administrators must approve it.`, type: "mfa-recovery", idempotencyKey: `mfa-recovery-${request.id}` }); return { ok: true, requestId: request.id };
}

async function auditTx(tx: any, adminId: string, action: "mfa.recovery.approve" | "mfa.recovery.reject" | "mfa.recovery.execute", targetUserId: string, metadata: Record<string, unknown>) {
  const [actor] = await tx.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, adminId)).limit(1);
  await tx.insert(adminAuditLogs).values({ adminUserId: adminId, action, targetUserId, metadata, actorNameSnapshot: actor?.name ?? null, actorEmailSnapshot: actor?.email ?? null });
}

export async function decideMfaRecovery(input: z.infer<typeof decisionSchema>) {
  const admin = await requireAdmin(); await enforceServerActionRateLimit("admin:mfa-recovery", admin.id, { limit: 20, windowSec: 60 }); const parsed = decisionSchema.parse(input);
  return db.transaction(async (tx) => { const [request] = await tx.select().from(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.id, parsed.requestId)).for("update").limit(1); if (!request || request.status !== "pending") throw new Error("Recovery request unavailable"); if (request.userId === admin.id) throw new Error("You cannot approve your own recovery request"); if (new Date() < request.coolingUntil) throw new Error("Cooling period is still active");
    await tx.insert(mfaRecoveryApprovals).values({ requestId: request.id, adminUserId: admin.id, decision: parsed.decision, note: parsed.note || null }); if (parsed.decision === "rejected") await tx.update(mfaRecoveryRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(mfaRecoveryRequests.id, request.id)); await auditTx(tx, admin.id, parsed.decision === "approved" ? "mfa.recovery.approve" : "mfa.recovery.reject", request.userId, { requestId: request.id, note: parsed.note ?? null }); return { ok: true };
  });
}

export async function executeMfaRecovery(requestId: string) { const admin = await requireAdmin(); await enforceServerActionRateLimit("admin:mfa-recovery-execute", admin.id, { limit: 5, windowSec: 60 }); const id = z.string().uuid().parse(requestId);
  return db.transaction(async (tx) => { const [request] = await tx.select().from(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.id, id)).for("update").limit(1); if (!request || request.status !== "pending") throw new Error("Recovery request unavailable"); const approvals = await tx.select({ adminUserId: mfaRecoveryApprovals.adminUserId }).from(mfaRecoveryApprovals).where(and(eq(mfaRecoveryApprovals.requestId, id), eq(mfaRecoveryApprovals.decision, "approved"))); if (!canExecuteRecovery({ createdAt: request.createdAt, coolingUntil: request.coolingUntil, approvals: approvals.map((row) => row.adminUserId), requesterId: request.userId, status: "pending" })) throw new Error("Recovery requires cooling elapsed and two distinct approvals"); const secret = process.env.BETTER_AUTH_SECRET; if (!secret) throw new Error("Recovery service unavailable"); const token = generateToken(); await tx.insert(authRecoveryHandoffs).values({ userId: request.userId, tokenHash: hashVerifier(`recovery-handoff:${token}`, secret), method: "manual_admin", expiresAt: new Date(Date.now() + 15 * 60_000), recoveryRequestId: request.id }); await tx.update(mfaRecoveryRequests).set({ status: "executed", executedAt: new Date(), updatedAt: new Date() }).where(eq(mfaRecoveryRequests.id, id)); await auditTx(tx, admin.id, "mfa.recovery.execute", request.userId, { requestId: id, approvals: approvals.length }); return { ok: true, handoffUrl: `/recover-access/${token}` }; }); }

export async function listMfaRecoveries(raw: z.input<typeof listSchema> = {}) { await requireAdmin(); const input = listSchema.parse(raw); const pageSize = 10; const search = input.search ? ilike(users.email, `%${input.search}%`) : undefined; const rows = await db.select({ id: mfaRecoveryRequests.id, userId: users.id, name: users.name, email: users.email, verified: users.emailVerified, banned: users.banned, status: mfaRecoveryRequests.status, reason: mfaRecoveryRequests.reason, evidence: mfaRecoveryRequests.evidence, coolingUntil: mfaRecoveryRequests.coolingUntil, createdAt: mfaRecoveryRequests.createdAt, executedAt: mfaRecoveryRequests.executedAt, approvals: sql<number>`(select count(*)::int from mfa_recovery_approvals a where a.request_id = ${mfaRecoveryRequests.id} and a.decision = 'approved')`, coolingElapsed: sql<boolean>`${mfaRecoveryRequests.coolingUntil} <= now()` }).from(mfaRecoveryRequests).innerJoin(users, eq(users.id, mfaRecoveryRequests.userId)).where(search).orderBy(desc(mfaRecoveryRequests.createdAt)).limit(pageSize).offset((input.page - 1) * pageSize); const pending = await db.select({ status: mfaRecoveryRequests.status, coolingUntil: mfaRecoveryRequests.coolingUntil, approvals: sql<number>`(select count(*)::int from mfa_recovery_approvals a where a.request_id = ${mfaRecoveryRequests.id} and a.decision = 'approved')` }).from(mfaRecoveryRequests); return { rows: rows.map((r) => ({ ...r, ready: r.status === "pending" && r.coolingElapsed && r.approvals >= 2 })), page: input.page, pageSize, summary: { pending: pending.filter((r) => r.status === "pending").length, cooling: pending.filter((r) => r.status === "pending" && r.coolingUntil > new Date()).length, ready: pending.filter((r) => r.status === "pending" && r.coolingUntil <= new Date() && r.approvals >= 2).length, executed: pending.filter((r) => r.status === "executed").length, rejected: pending.filter((r) => r.status === "rejected").length } }; }
export const listPendingMfaRecoveries = listMfaRecoveries;

export type MfaRecoveryRow = Awaited<ReturnType<typeof listMfaRecoveries>>["rows"][number];
