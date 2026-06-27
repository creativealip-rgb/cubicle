import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

const GRACE_PERIOD_DAYS = 3;
const REMINDER_DAYS_BEFORE = [7, 3, 1];

/**
 * Downgrade workspaces whose plan has expired (+ grace period).
 * Returns list of workspace IDs that were downgraded.
 */
export async function expirePlans(): Promise<string[]> {
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_PERIOD_DAYS);

  const expired = await db
    .select({ id: workspaces.id, name: workspaces.name, plan: workspaces.plan, planExpiresAt: workspaces.planExpiresAt })
    .from(workspaces)
    .where(
      and(
        sql`${workspaces.plan} != 'free'`,
        isNotNull(workspaces.planExpiresAt),
        sql`${workspaces.planExpiresAt} < ${graceCutoff.toISOString()}`,
      ),
    );

  if (expired.length === 0) return [];

  const ids: string[] = [];
  for (const ws of expired) {
    await db
      .update(workspaces)
      .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
      .where(eq(workspaces.id, ws.id));
    ids.push(ws.id);
    console.log(`[subscription] downgraded workspace "${ws.name}" (${ws.id}) from ${ws.plan} to free, expired ${ws.planExpiresAt?.toISOString()}`);
  }

  return ids;
}

/**
 * Find workspaces that need renewal reminders.
 * Returns workspaces with daysUntilExpiry for each.
 */
export async function getExpiringWorkspaces(): Promise<Array<{ id: string; name: string; plan: string; planExpiresAt: Date; daysUntilExpiry: number }>> {
  const now = new Date();
  const lookAhead = new Date();
  lookAhead.setDate(lookAhead.getDate() + 8); // 8 days ahead

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      plan: workspaces.plan,
      planExpiresAt: workspaces.planExpiresAt,
    })
    .from(workspaces)
    .where(
      and(
        sql`${workspaces.plan} != 'free'`,
        isNotNull(workspaces.planExpiresAt),
        sql`${workspaces.planExpiresAt} > ${now.toISOString()}`,
        sql`${workspaces.planExpiresAt} < ${lookAhead.toISOString()}`,
      ),
    );

  return rows
    .filter((r): r is typeof r & { planExpiresAt: Date } => r.planExpiresAt !== null)
    .map((r) => ({
      ...r,
      daysUntilExpiry: Math.ceil((r.planExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((r) => REMINDER_DAYS_BEFORE.includes(r.daysUntilExpiry));
}

/**
 * Get subscription status summary for a workspace.
 */
export function getSubscriptionStatus(planExpiresAt: Date | null, plan: string): {
  status: "active" | "expiring" | "grace" | "expired";
  daysRemaining: number | null;
  message: string;
} {
  if (plan === "free" || !planExpiresAt) {
    return { status: "active", daysRemaining: null, message: "Plan Free aktif selamanya." };
  }

  const now = new Date();
  const diffMs = planExpiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= -GRACE_PERIOD_DAYS) {
    return { status: "expired", daysRemaining: 0, message: `Plan ${plan.toUpperCase()} sudah kedaluwarsa. Upgrade untuk melanjutkan.` };
  }
  if (diffDays <= 0) {
    return { status: "grace", daysRemaining: 0, message: `Plan ${plan.toUpperCase()} kedaluwarsa. Grace period ${GRACE_PERIOD_DAYS} hari. Segera perpanjang!` };
  }
  if (diffDays <= 7) {
    return { status: "expiring", daysRemaining: diffDays, message: `Plan ${plan.toUpperCase()} berakhir dalam ${diffDays} hari.` };
  }
  return { status: "active", daysRemaining: diffDays, message: `Plan ${plan.toUpperCase()} aktif hingga ${planExpiresAt.toLocaleDateString("id-ID")}.` };
}
