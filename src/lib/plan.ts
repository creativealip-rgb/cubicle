import { db } from "@/db";
import { aiUsageDaily, users, workspaceMembers } from "@/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";

export type PlanTier = "free" | "solo" | "team";

export interface PlanLimits {
  maxWorkspaces: number;      // 0 = unlimited
  canInviteMembers: boolean;
  maxMembers: number;         // 0 = unlimited
  hasClientPortal: boolean;
  hasAiAssistant: boolean;
  // Rate limits
  aiRequestsPerMonth: number; // 0 = unlimited
  apiRequestsPerMinute: number; // 0 = unlimited
  maxClients: number;         // 0 = unlimited
  maxProjects: number;        // 0 = unlimited
  maxInvoicesPerMonth: number; // 0 = unlimited
  maxFileSizeMb: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxWorkspaces: 1,
    canInviteMembers: false,
    maxMembers: 1,
    hasClientPortal: true,
    hasAiAssistant: true,
    aiRequestsPerMonth: 10,
    apiRequestsPerMinute: 30,
    maxClients: 3,
    maxProjects: 5,
    maxInvoicesPerMonth: 10,
    maxFileSizeMb: 5,
  },
  solo: {
    maxWorkspaces: 3,
    canInviteMembers: false,
    maxMembers: 1,
    hasClientPortal: true,
    hasAiAssistant: true,
    aiRequestsPerMonth: 100,
    apiRequestsPerMinute: 120,
    maxClients: 0, // unlimited
    maxProjects: 0,
    maxInvoicesPerMonth: 0,
    maxFileSizeMb: 25,
  },
  team: {
    maxWorkspaces: 3,
    canInviteMembers: true,
    maxMembers: 5,
    hasClientPortal: true,
    hasAiAssistant: true,
    aiRequestsPerMonth: 1000,
    apiRequestsPerMinute: 0,   // unlimited
    maxClients: 0,
    maxProjects: 0,
    maxInvoicesPerMonth: 0,
    maxFileSizeMb: 50,
  },
};

const PLAN_GRACE_DAYS = 3;

export function getEffectivePlan(
  plan: string | null | undefined,
  planExpiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): PlanTier {
  const tier = ((plan as PlanTier) in PLAN_LIMITS ? plan : "free") as PlanTier;
  if (tier === "free") return "free";
  if (!planExpiresAt) return tier;

  const expires = planExpiresAt instanceof Date ? planExpiresAt : new Date(planExpiresAt);
  if (Number.isNaN(expires.getTime())) return "free";

  const graceUntil = new Date(expires.getTime() + PLAN_GRACE_DAYS * 24 * 60 * 60 * 1000);
  return now <= graceUntil ? tier : "free";
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier)] ?? PLAN_LIMITS.free;
}

export function getAiEntitlementFailure(plan: string): { status: number; error: string } | null {
  const limits = getPlanLimits(plan);
  if (!limits.hasAiAssistant) {
    return { status: 403, error: "AI Assistant tidak tersedia di plan ini." };
  }
  return null;
}

// ─── Workspace-level rate limiter (in-memory, per plan) ───

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateEntry>();

// Cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateStore) {
    if (entry.resetAt < now) rateStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a workspace + action type.
 * Returns { allowed, remaining, resetAt, limit }.
 */
export function checkWorkspaceRateLimit(
  workspaceId: string,
  action: "ai" | "api" | "clients" | "projects" | "invoices",
  plan: string,
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const limits = getPlanLimits(plan);

  let limit: number;
  let windowSec: number;

  switch (action) {
    case "ai":
      limit = limits.aiRequestsPerMonth;
      windowSec = 30 * 86400; // 30 days
      break;
    case "api":
      limit = limits.apiRequestsPerMinute;
      windowSec = 60;
      break;
    case "clients":
      return { allowed: true, remaining: -1, resetAt: 0, limit: 0 }; // checked via DB count
    case "projects":
      return { allowed: true, remaining: -1, resetAt: 0, limit: 0 };
    case "invoices":
      return { allowed: true, remaining: -1, resetAt: 0, limit: 0 };
  }

  // Unlimited
  if (limit === 0) {
    return { allowed: true, remaining: -1, resetAt: 0, limit: 0 };
  }

  const key = `${workspaceId}:${action}`;
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowSec * 1000;
    rateStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, limit };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
}

// ─── AI monthly quota (DB-backed, atomic, persists across restarts) ───

/**
 * Atomically reserve one AI request for a workspace's current month and check
 * against the plan's monthly cap. The whole reserve-or-reject decision is a
 * SINGLE statement:
 *
 *   INSERT INTO ai_usage_daily (workspace_id, usage_date, count)
 *   VALUES ($ws, current_date, 1)
 *   ON CONFLICT (workspace_id, usage_date)
 *   DO UPDATE SET count = ai_usage_daily.count + 1, updated_at = now()
 *   WHERE ai_usage_daily.count < $limit
 *   RETURNING count
 *
 * The `setWhere` guard makes the increment conditional: if the current count
 * is already at the cap, the UPDATE matches zero rows, RETURNING yields no
 * row, and nothing is incremented — so concurrent requests can NEVER push the
 * counter past the limit. There is no read-then-write race window.
 *
 * A limit of 0 means unlimited (no row written; always allowed).
 *
 * ── Refund / rollback boundary ─────────────────────────────────────────
 * Callers reserve quota BEFORE invoking the AI provider and must release it
 * (via releaseAiQuota) ONLY when the provider call failed and the reservation
 * will never be fulfilled. Once the provider has returned a successful
 * response the request is "spent" — NEVER refund it, even if downstream
 * persistence (DB write of the generated content, activity log, etc.) fails.
 * Refunding after a successful provider response would let users exceed the
 * cap by repeatedly retrying persistence.
 */
export async function checkAiRateLimitDb(
  workspaceId: string,
  plan: string,
): Promise<{ allowed: boolean; count: number; limit: number; resetAt: number }> {
  const limit = getPlanLimits(plan).aiRequestsPerMonth;

  // Next UTC month 1st = reset boundary
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

  if (limit === 0) {
    return { allowed: true, count: -1, limit: 0, resetAt: reset };
  }

  // Single atomic reserve-or-reject. Empty result = cap already reached.
  const [row] = await db
    .insert(aiUsageDaily)
    .values({
      workspaceId,
      usageDate: sql`date_trunc('month', current_date)::date`,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [aiUsageDaily.workspaceId, aiUsageDaily.usageDate],
      set: {
        count: sql`${aiUsageDaily.count} + 1`,
        updatedAt: new Date(),
      },
      setWhere: sql`${aiUsageDaily.count} < ${limit}`,
    })
    .returning({ count: aiUsageDaily.count });

  if (!row) {
    return { allowed: false, count: limit, limit, resetAt: reset };
  }

  return { allowed: true, count: row.count, limit, resetAt: reset };
}

/**
 * Atomically release one previously-reserved AI request for a workspace's
 * current month (refund). Decrement is floored at zero — it can never make
 * the counter negative, and it never affects rows from a previous month.
 *
 * ONLY call this when the provider call FAILED after a successful
 * checkAiRateLimitDb reservation. Never refund after a successful provider
 * response (see checkAiRateLimitDb boundary note).
 */
export async function releaseAiQuota(workspaceId: string): Promise<void> {
  await db
    .update(aiUsageDaily)
    .set({
      count: sql`GREATEST(${aiUsageDaily.count} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiUsageDaily.workspaceId, workspaceId),
        eq(aiUsageDaily.usageDate, sql`date_trunc('month', current_date)::date`),
        gt(aiUsageDaily.count, 0),
      ),
    );
}

// ─── Entity count checks (DB-backed) ───

/**
 * Check if workspace can create more of an entity type.
 */
export async function checkEntityLimit(
  workspaceId: string,
  entity: "clients" | "projects" | "invoices",
  plan: string,
): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
  const limits = getPlanLimits(plan);

  let maxCount: number;
  let tableName: string;
  let label: string;

  switch (entity) {
    case "clients":
      maxCount = limits.maxClients;
      tableName = "clients";
      label = "klien";
      break;
    case "projects":
      maxCount = limits.maxProjects;
      tableName = "projects";
      label = "proyek";
      break;
    case "invoices":
      maxCount = limits.maxInvoicesPerMonth;
      tableName = "invoices";
      label = "invoice/bulan";
      break;
  }

  if (maxCount === 0) {
    return { allowed: true, current: 0, limit: 0 };
  }

  // Parameterized queries — workspaceId is bound, never string-interpolated.
  // tableName is chosen from a fixed switch above (never user input), so it is
  // safe to inject via sql.identifier for the table name only.
  const table = sql.identifier(tableName);
  const query =
    entity === "invoices"
      ? sql<{ cnt: number }>`SELECT count(*)::int as cnt FROM ${table} WHERE workspace_id = ${workspaceId} AND created_at >= date_trunc('month', current_date)`
      : sql<{ cnt: number }>`SELECT count(*)::int as cnt FROM ${table} WHERE workspace_id = ${workspaceId}`;

  const result = await db.execute(query);
  const current = (result.rows[0] as { cnt: number })?.cnt ?? 0;

  if (current >= maxCount) {
    const reason = plan === "free"
      ? `Free plan maksimal ${maxCount} ${label}. Upgrade ke Solo untuk unlimited.`
      : `Batas ${maxCount} ${label} tercapai. Upgrade untuk lebih.`;
    return { allowed: false, current, limit: maxCount, reason };
  }

  return { allowed: true, current, limit: maxCount };
}

// ─── Plan helpers ───

export async function canCreateWorkspace(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const plan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const limits = getPlanLimits(plan);

  if (limits.maxWorkspaces > 0 && count >= limits.maxWorkspaces) {
    return {
      allowed: false,
      reason: plan === "free"
        ? "Free plan cuma bisa 1 workspace. Upgrade ke Solo untuk buat workspace tambahan."
        : `Plan ${plan.toUpperCase()} maksimal ${limits.maxWorkspaces} workspace. Upgrade ke Team untuk unlimited.`,
    };
  }

  return { allowed: true };
}

export async function canInviteMember(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const plan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const limits = getPlanLimits(plan);

  if (!limits.canInviteMembers) {
    return {
      allowed: false,
      reason: plan === "free"
        ? "Free plan tidak bisa mengundang anggota. Upgrade ke Team untuk kolaborasi."
        : "Upgrade ke Team untuk mengundang anggota.",
    };
  }

  return { allowed: true };
}

export async function canAddWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const plan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const limits = getPlanLimits(plan);

  if (!limits.canInviteMembers) {
    return {
      allowed: false,
      reason: plan === "free"
        ? "Free plan tidak bisa mengundang anggota. Upgrade ke Team untuk kolaborasi."
        : "Upgrade ke Team untuk mengundang anggota.",
    };
  }

  if (limits.maxMembers > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    if (count >= limits.maxMembers) {
      return {
        allowed: false,
        reason: `Plan ${plan.toUpperCase()} maksimal ${limits.maxMembers} anggota.`,
        current: count,
        limit: limits.maxMembers,
      };
    }
  }

  return { allowed: true };
}

/**
 * Get user plan from user ID.
 */
export async function getUserPlan(userId: string): Promise<string> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return getEffectivePlan(user?.plan, user?.planExpiresAt);
}
