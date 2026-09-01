"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLogs, mfaRecoveryApprovals, mfaRecoveryRequests, passkeys, sessions, twoFactors, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { canExecuteRecovery } from "@/lib/mfa/manual-recovery-policy";

const decisionSchema = z.object({ requestId: z.string().uuid(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).optional() });

export async function decideMfaRecovery(input: z.infer<typeof decisionSchema>) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:mfa-recovery", admin.id, { limit: 20, windowSec: 60 });
  const parsed = decisionSchema.parse(input);

  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.id, parsed.requestId)).for("update").limit(1);
    if (!request || request.status !== "pending") throw new Error("Recovery request unavailable");
    if (request.userId === admin.id) throw new Error("Recovery requester cannot approve own request");
    if (new Date() < request.coolingUntil) throw new Error("Recovery cooling period active");

    await tx.insert(mfaRecoveryApprovals).values({ requestId: request.id, adminUserId: admin.id, decision: parsed.decision, note: parsed.note });
    const action = parsed.decision === "approved" ? "mfa.recovery.approve" : "mfa.recovery.reject";
    if (parsed.decision === "rejected") await tx.update(mfaRecoveryRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(mfaRecoveryRequests.id, request.id));
    await tx.insert(adminAuditLogs).values({ adminUserId: admin.id, action, targetUserId: request.userId, metadata: { requestId: request.id } });
    return { ok: true };
  });
}

export async function executeMfaRecovery(requestId: string) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:mfa-recovery-execute", admin.id, { limit: 5, windowSec: 60 });
  const id = z.string().uuid().parse(requestId);

  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.id, id)).for("update").limit(1);
    if (!request || request.status !== "pending") throw new Error("Recovery request unavailable");
    const approvals = await tx.select({ adminUserId: mfaRecoveryApprovals.adminUserId }).from(mfaRecoveryApprovals).where(and(eq(mfaRecoveryApprovals.requestId, id), eq(mfaRecoveryApprovals.decision, "approved")));
    if (!canExecuteRecovery({ createdAt: request.createdAt, coolingUntil: request.coolingUntil, approvals: approvals.map((row) => row.adminUserId), requesterId: request.userId, status: "pending" })) throw new Error("Recovery requirements not met");

    await tx.delete(sessions).where(eq(sessions.userId, request.userId));
    await tx.delete(passkeys).where(eq(passkeys.userId, request.userId));
    await tx.delete(twoFactors).where(eq(twoFactors.userId, request.userId));
    await tx.update(users).set({ twoFactorEnabled: false, mfaEnrollmentDeadline: new Date(), updatedAt: new Date() }).where(eq(users.id, request.userId));
    await tx.update(mfaRecoveryRequests).set({ status: "executed", executedAt: new Date(), updatedAt: new Date() }).where(eq(mfaRecoveryRequests.id, id));
    await tx.insert(adminAuditLogs).values({ adminUserId: admin.id, action: "mfa.recovery.execute", targetUserId: request.userId, metadata: { requestId: id, approvals: approvals.length } });
    return { ok: true };
  });
}

export async function listPendingMfaRecoveries() {
  await requireAdmin();
  return db.select({ id: mfaRecoveryRequests.id, userId: mfaRecoveryRequests.userId, email: users.email, status: mfaRecoveryRequests.status, reason: mfaRecoveryRequests.reason, coolingUntil: mfaRecoveryRequests.coolingUntil, createdAt: mfaRecoveryRequests.createdAt, approvals: sql<number>`(select count(*)::int from mfa_recovery_approvals a where a.request_id = ${mfaRecoveryRequests.id} and a.decision = 'approved')` }).from(mfaRecoveryRequests).innerJoin(users, eq(users.id, mfaRecoveryRequests.userId)).where(eq(mfaRecoveryRequests.status, "pending"));
}
