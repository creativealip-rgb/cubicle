import { db } from "@/db";
import { userAiAddons } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getPeriodExpiry, type BillingPeriod } from "@/lib/billing-plans";

export async function listActiveAiAddons(userId: string, now: Date = new Date()) {
  return db
    .select({
      id: userAiAddons.id,
      requestsQuota: userAiAddons.requestsQuota,
      amount: userAiAddons.amount,
      billingPeriod: userAiAddons.billingPeriod,
      status: userAiAddons.status,
      startsAt: userAiAddons.startsAt,
      endsAt: userAiAddons.endsAt,
    })
    .from(userAiAddons)
    .where(
      and(
        eq(userAiAddons.userId, userId),
        sql`${userAiAddons.status} IN ('active', 'cancel_scheduled')`,
        gte(userAiAddons.endsAt, now),
      ),
    )
    .orderBy(userAiAddons.createdAt);
}

export async function getUserPurchasedAiQuota(userId: string, now: Date = new Date()): Promise<number> {
  const [result] = await db
    .select({
      totalQuota: sql<number>`coalesce(sum(${userAiAddons.requestsQuota}), 0)::int`,
    })
    .from(userAiAddons)
    .where(
      and(
        eq(userAiAddons.userId, userId),
        sql`${userAiAddons.status} IN ('active', 'cancel_scheduled')`,
        gte(userAiAddons.endsAt, now),
      ),
    );

  return Number(result?.totalQuota ?? 0);
}

export async function activateAiAddonTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    userId: string;
    requestsQuota: number;
    amount: number;
    billingPeriod: BillingPeriod;
    paidAt: Date;
    providerOrderId: string;
    providerEventId: string;
  },
): Promise<{ kind: "activated" | "existing"; entitlementId: string }> {
  const existing = await tx
    .select({ id: userAiAddons.id })
    .from(userAiAddons)
    .where(eq(userAiAddons.providerOrderId, input.providerOrderId))
    .limit(1);

  if (existing[0]) {
    return { kind: "existing", entitlementId: existing[0].id };
  }

  const endsAt = getPeriodExpiry(input.paidAt, input.billingPeriod);

  const [created] = await tx
    .insert(userAiAddons)
    .values({
      userId: input.userId,
      requestsQuota: input.requestsQuota,
      amount: String(input.amount),
      billingPeriod: input.billingPeriod,
      status: "active",
      startsAt: input.paidAt,
      endsAt,
      autoRenew: false,
      providerOrderId: input.providerOrderId,
      providerEventId: input.providerEventId,
    })
    .returning({ id: userAiAddons.id });

  return { kind: "activated", entitlementId: created.id };
}
