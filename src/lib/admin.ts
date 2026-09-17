import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ForbiddenError, requireUser, UnauthorizedError, type SessionUser } from "@/lib/access";

export type AdminAction =
  | "user.create"
  | "user.update"
  | "user.password_reset"
  | "user.ban"
  | "user.unban"
  | "user.plan_change"
  | "mfa.recovery.approve"
  | "mfa.recovery.reject"
  | "mfa.recovery.execute"
  | "marketing_spend.create"
  | "marketing_spend.update"
  | "marketing_spend.delete";

export interface AdminAuditInput {
  targetUserId?: string;
  targetWorkspaceId?: string;
  targetLabelSnapshot?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Superadmin guard — the single gate for the admin control plane.
 *
 * Runs on EVERY admin server action (defense-in-depth) in addition to the
 * (admin) route-group layout guard. Verifies:
 *   1. A valid Better Auth session exists (cookie is cross-subdomain
 *      `.cubiqlo.com`, so admin.cubiqlo.com reads the app session).
 *   2. The session user's `users.role` is 'admin' (re-read from DB — never
 *      trust the session snapshot, since role changes must apply instantly).
 *   3. The admin is not banned (banned admins lose access immediately).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  const [row] = await db
    .select({ role: users.role, banned: users.banned })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row || row.role !== "admin") {
    throw new ForbiddenError("Admin access denied");
  }
  if (row.banned) {
    throw new UnauthorizedError("Account suspended");
  }
  return user;
}

/**
 * Append an immutable entry to the admin audit trail. Called by every admin
 * mutation AFTER the write succeeds so the log only contains completed
 * operations. Throwing here fails the mutation closed — audit gaps are worse
 * than retryable action failures.
 */
export async function writeAdminAudit(
  adminId: string,
  action: AdminAction,
  input: AdminAuditInput = {},
): Promise<void> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rawIp = input.ipAddress ?? requestHeaders.get("x-real-ip") ?? forwarded;
  const ipAddress = rawIp?.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 64) || null;
  const userAgent = (input.userAgent ?? requestHeaders.get("user-agent"))?.slice(0, 512) || null;
  const requestId = (input.requestId ?? requestHeaders.get("x-request-id"))?.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 128) || null;
  const [actor] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, adminId)).limit(1);
  await db.insert(adminAuditLogs).values({
    adminUserId: adminId,
    action,
    targetUserId: input.targetUserId ?? null,
    targetWorkspaceId: input.targetWorkspaceId ?? null,
    metadata: input.metadata ?? {},
    ipAddress,
    actorNameSnapshot: actor?.name ?? null,
    actorEmailSnapshot: actor?.email ?? null,
    targetLabelSnapshot: input.targetLabelSnapshot ?? null,
    userAgent,
    requestId,
  });
}
