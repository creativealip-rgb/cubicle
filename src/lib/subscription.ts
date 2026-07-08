import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

const GRACE_PERIOD_DAYS = 3;
const REMINDER_DAYS_BEFORE = [7, 3, 1];

/**
 * Downgrade users whose plan has expired (+ grace period).
 * Returns list of user IDs that were downgraded.
 */
export async function expirePlans(): Promise<string[]> {
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_PERIOD_DAYS);

  const expired = await db
    .select({ id: users.id, name: users.name, plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(
      and(
        sql`${users.plan} != 'free'`,
        isNotNull(users.planExpiresAt),
        sql`${users.planExpiresAt} < ${graceCutoff.toISOString()}`,
      ),
    );

  if (expired.length === 0) return [];

  const ids: string[] = [];
  for (const user of expired) {
    await db
      .update(users)
      .set({ plan: "free", planExpiresAt: null })
      .where(eq(users.id, user.id));
    ids.push(user.id);
    console.log(`[subscription] downgraded user "${user.name}" (${user.id}) from ${user.plan} to free, expired ${user.planExpiresAt?.toISOString()}`);
  }

  return ids;
}

/**
 * Find users that need renewal reminders.
 * Returns users with daysUntilExpiry for each.
 */
export async function getExpiringUsers(): Promise<Array<{ id: string; name: string | null; plan: string; planExpiresAt: Date; daysUntilExpiry: number }>> {
  const now = new Date();
  const lookAhead = new Date();
  lookAhead.setDate(lookAhead.getDate() + 8); // 8 days ahead

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
    })
    .from(users)
    .where(
      and(
        sql`${users.plan} != 'free'`,
        isNotNull(users.planExpiresAt),
        sql`${users.planExpiresAt} > ${now.toISOString()}`,
        sql`${users.planExpiresAt} < ${lookAhead.toISOString()}`,
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
 * Get subscription status summary for a user.
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
