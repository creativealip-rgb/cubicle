import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userExtraMemberEntitlements, users } from "@/db/schema";
import { getPeriodExpiry, type BillingPeriod, type ExtraMemberAddonKey, EXTRA_MEMBER_ADDONS } from "@/lib/billing-plans";
import { getEffectivePlan } from "@/lib/plan";

export type ExtraMemberStatus = "active" | "cancel_scheduled" | "cancelled" | "expired";

/**
 * Sum of active extra member seats owned by a user across their workspaces.
 */
export async function getActiveExtraMemberSlots(userId: string, now: Date = new Date()): Promise<number> {
  const [row] = await db
    .select({ quantity: sql<number>`coalesce(sum(${userExtraMemberEntitlements.quantity}), 0)::int` })
    .from(userExtraMemberEntitlements)
    .where(
      and(
        eq(userExtraMemberEntitlements.userId, userId),
        sql`${userExtraMemberEntitlements.status} IN ('active', 'cancel_scheduled')`,
        sql`${userExtraMemberEntitlements.endsAt} > ${now.toISOString()}`,
      ),
    );
  return Number(row?.quantity ?? 0);
}

/**
 * Active extra-member entitlement rows for a user.
 */
export async function listActiveExtraMemberEntitlements(userId: string, now: Date = new Date()) {
  return db
    .select({
      id: userExtraMemberEntitlements.id,
      quantity: userExtraMemberEntitlements.quantity,
      amount: userExtraMemberEntitlements.amount,
      billingPeriod: userExtraMemberEntitlements.billingPeriod,
      status: userExtraMemberEntitlements.status,
      startsAt: userExtraMemberEntitlements.startsAt,
      endsAt: userExtraMemberEntitlements.endsAt,
      autoRenew: userExtraMemberEntitlements.autoRenew,
    })
    .from(userExtraMemberEntitlements)
    .where(
      and(
        eq(userExtraMemberEntitlements.userId, userId),
        sql`${userExtraMemberEntitlements.status} IN ('active', 'cancel_scheduled')`,
        sql`${userExtraMemberEntitlements.endsAt} > ${now.toISOString()}`,
      ),
    )
    .orderBy(userExtraMemberEntitlements.endsAt);
}

/**
 * Guard for purchasing extra member slots. Only Team plan owners can purchase.
 */
export async function canPurchaseExtraMember(userId: string, now: Date = new Date()): Promise<{ allowed: boolean; reason?: string }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { allowed: false, reason: "User tidak ditemukan" };

  const plan = getEffectivePlan(user.plan, user.planExpiresAt, now);
  if (plan !== "team") {
    return {
      allowed: false,
      reason: "Add-on anggota tim hanya tersedia untuk pengguna Team Plan.",
    };
  }

  return { allowed: true };
}

export interface ActivateExtraMemberInput {
  userId: string;
  quantity: number;
  amount: number;
  billingPeriod: BillingPeriod;
  paidAt?: Date | null;
  providerOrderId?: string | null;
  providerEventId?: string | null;
}

export async function activateExtraMemberEntitlementTx(
  tx: any,
  input: ActivateExtraMemberInput,
): Promise<{ kind: "new" | "existing"; entitlementId: string }> {
  const now = input.paidAt ?? new Date();
  const startsAt = now;
  const endsAt = getPeriodExpiry(startsAt, input.billingPeriod);

  if (input.providerOrderId) {
    const [existing] = await tx
      .select({ id: userExtraMemberEntitlements.id })
      .from(userExtraMemberEntitlements)
      .where(eq(userExtraMemberEntitlements.providerOrderId, input.providerOrderId))
      .limit(1);
    if (existing) {
      return { kind: "existing", entitlementId: existing.id };
    }
  }

  const [inserted] = await tx
    .insert(userExtraMemberEntitlements)
    .values({
      userId: input.userId,
      quantity: input.quantity,
      amount: String(input.amount),
      billingPeriod: input.billingPeriod,
      status: "active",
      startsAt,
      endsAt,
      autoRenew: false,
      providerOrderId: input.providerOrderId ?? null,
      providerEventId: input.providerEventId ?? null,
    })
    .returning({ id: userExtraMemberEntitlements.id });

  return { kind: "new", entitlementId: inserted.id };
}
