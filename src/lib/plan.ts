import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type PlanTier = "free" | "solo" | "team";

export interface PlanLimits {
  maxWorkspaces: number;      // 0 = unlimited
  canInviteMembers: boolean;
  maxMembers: number;         // 0 = unlimited
  hasClientPortal: boolean;
  hasAiAssistant: boolean;
  // Rate limits
  aiRequestsPerDay: number;   // 0 = unlimited
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
    hasClientPortal: false,
    hasAiAssistant: false,
    aiRequestsPerDay: 0,       // no AI
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
    aiRequestsPerDay: 50,
    apiRequestsPerMinute: 120,
    maxClients: 0, // unlimited
    maxProjects: 0,
    maxInvoicesPerMonth: 0,
    maxFileSizeMb: 25,
  },
  team: {
    maxWorkspaces: 0,
    canInviteMembers: true,
    maxMembers: 0,
    hasClientPortal: true,
    hasAiAssistant: true,
    aiRequestsPerDay: 0,       // unlimited
    apiRequestsPerMinute: 0,   // unlimited
    maxClients: 0,
    maxProjects: 0,
    maxInvoicesPerMonth: 0,
    maxFileSizeMb: 50,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier)] ?? PLAN_LIMITS.free;
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
      limit = limits.aiRequestsPerDay;
      windowSec = 86400; // 24h
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

  let countQuery: string;
  if (entity === "invoices") {
    // Count invoices this month
    countQuery = `SELECT count(*)::int as cnt FROM ${tableName} WHERE workspace_id = '${workspaceId}' AND created_at >= date_trunc('month', current_date)`;
  } else {
    countQuery = `SELECT count(*)::int as cnt FROM ${tableName} WHERE workspace_id = '${workspaceId}'`;
  }

  const result = await db.execute(sql.raw(countQuery));
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

  const [membership] = await db
    .select({ plan: workspaces.plan })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  const plan = membership?.plan ?? "free";
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

export async function canInviteMember(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
  const [ws] = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const plan = ws?.plan ?? "free";
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
      return { allowed: false, reason: `Maksimal ${limits.maxMembers} anggota. Upgrade untuk lebih.` };
    }
  }

  return { allowed: true };
}

/**
 * Get workspace plan from workspace ID.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<string> {
  const [ws] = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return ws?.plan ?? "free";
}
