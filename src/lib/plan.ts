import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type PlanTier = "free" | "solo" | "team";

export interface PlanLimits {
  maxWorkspaces: number;      // 0 = unlimited
  canInviteMembers: boolean;
  maxMembers: number;         // 0 = unlimited (owner counts)
  hasClientPortal: boolean;
  hasAiAssistant: boolean;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxWorkspaces: 1,
    canInviteMembers: false,
    maxMembers: 1,
    hasClientPortal: false,
    hasAiAssistant: false,
  },
  solo: {
    maxWorkspaces: 3,
    canInviteMembers: false,
    maxMembers: 1,
    hasClientPortal: true,
    hasAiAssistant: true,
  },
  team: {
    maxWorkspaces: 0, // unlimited
    canInviteMembers: true,
    maxMembers: 0, // unlimited
    hasClientPortal: true,
    hasAiAssistant: true,
  },
};

/**
 * Get plan limits for a workspace.
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier)] ?? PLAN_LIMITS.free;
}

/**
 * Check if a workspace can create more workspaces.
 * Returns { allowed, reason }.
 */
export async function canCreateWorkspace(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Count user's workspaces
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  // Get user's current plan (use the first workspace's plan as reference)
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

/**
 * Check if a workspace can invite more members.
 */
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
