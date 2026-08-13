import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userExtraWorkspaceEntitlements, users, workspaces } from "@/db/schema";
import { getPeriodExpiry, type BillingPeriod } from "@/lib/billing-plans";
import { getEffectivePlan, getPlanLimits } from "@/lib/plan";

export const EXTRA_WORKSPACE_SLOTS_PER_ENTITLEMENT = 1;

export type ExtraWorkspaceStatus = "active" | "cancel_scheduled" | "cancelled" | "expired";

/**
 * Sum of active (not yet ended) extra-workspace slots owned by a user.
 * `cancel_scheduled` entitlements still count until their period ends, so
 * cancelling at period end never causes an immediate workspace-count drop.
 */
export async function getActiveExtraWorkspaceSlots(userId: string, now: Date = new Date()): Promise<number> {
  const [row] = await db
    .select({ quantity: sql<number>`coalesce(sum(${userExtraWorkspaceEntitlements.quantity}), 0)::int` })
    .from(userExtraWorkspaceEntitlements)
    .where(
      and(
        eq(userExtraWorkspaceEntitlements.userId, userId),
        sql`${userExtraWorkspaceEntitlements.status} IN ('active', 'cancel_scheduled')`,
        sql`${userExtraWorkspaceEntitlements.endsAt} > ${now.toISOString()}`,
      ),
    );
  return Number(row?.quantity ?? 0);
}

/**
 * Active extra-workspace entitlement rows for a user (list endpoint / UI).
 * Mirrors `listActiveStorageAddons`: `cancel_scheduled` rows stay listed with
 * their period end so the UI can show "active until …" and keep the cancel
 * button disabled.
 */
export async function listActiveExtraWorkspaceEntitlements(userId: string, now: Date = new Date()) {
  return db
    .select({
      id: userExtraWorkspaceEntitlements.id,
      quantity: userExtraWorkspaceEntitlements.quantity,
      amount: userExtraWorkspaceEntitlements.amount,
      billingPeriod: userExtraWorkspaceEntitlements.billingPeriod,
      status: userExtraWorkspaceEntitlements.status,
      startsAt: userExtraWorkspaceEntitlements.startsAt,
      endsAt: userExtraWorkspaceEntitlements.endsAt,
      autoRenew: userExtraWorkspaceEntitlements.autoRenew,
    })
    .from(userExtraWorkspaceEntitlements)
    .where(
      and(
        eq(userExtraWorkspaceEntitlements.userId, userId),
        sql`${userExtraWorkspaceEntitlements.status} IN ('active', 'cancel_scheduled')`,
        sql`${userExtraWorkspaceEntitlements.endsAt} > ${now.toISOString()}`,
      ),
    )
    .orderBy(userExtraWorkspaceEntitlements.endsAt);
}

/**
 * Team-only guard for purchasing extra workspace slots. Returns the reason
 * when the purchase must be rejected.
 */
export async function canPurchaseExtraWorkspace(userId: string, now: Date = new Date()): Promise<{ allowed: boolean; reason?: string }> {
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
      reason: "Extra workspace hanya tersedia untuk plan Team. Upgrade ke Team terlebih dahulu.",
    };
  }
  return { allowed: true };
}

/**
 * Activate a paid extra-workspace entitlement inside the webhook transaction.
 * Idempotent on `providerEventId` (webhook replay) and `providerOrderId`
 * (same order completing twice): both return the existing entitlement.
 */
export async function activateExtraWorkspaceEntitlementTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    userId: string;
    quantity: number;
    amount: number;
    billingPeriod: BillingPeriod;
    paidAt: Date;
    providerOrderId?: string | null;
    providerEventId?: string | null;
  },
): Promise<{ kind: "created" | "existing"; entitlementId: string }> {
  const existing = input.providerEventId
    ? await tx
        .select({ id: userExtraWorkspaceEntitlements.id })
        .from(userExtraWorkspaceEntitlements)
        .where(eq(userExtraWorkspaceEntitlements.providerEventId, input.providerEventId))
        .limit(1)
    : [];
  if (existing[0]) return { kind: "existing", entitlementId: existing[0].id };

  const byOrder = input.providerOrderId
    ? await tx
        .select({ id: userExtraWorkspaceEntitlements.id })
        .from(userExtraWorkspaceEntitlements)
        .where(eq(userExtraWorkspaceEntitlements.providerOrderId, input.providerOrderId))
        .limit(1)
    : [];
  if (byOrder[0]) return { kind: "existing", entitlementId: byOrder[0].id };

  const startsAt = input.paidAt;
  const endsAt = getPeriodExpiry(startsAt, input.billingPeriod);
  const [inserted] = await tx
    .insert(userExtraWorkspaceEntitlements)
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
    .returning({ id: userExtraWorkspaceEntitlements.id });
  return { kind: "created", entitlementId: inserted.id };
}

/**
 * Schedule cancellation at period end: entitlement stays active (slots still
 * count) until `ends_at`, then the expiry sweep flips it to `cancelled`.
 * Idempotent — repeating the cancel returns the same result.
 */
export async function cancelExtraWorkspaceEntitlement(
  entitlementId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const [entitlement] = await db
    .select()
    .from(userExtraWorkspaceEntitlements)
    .where(and(eq(userExtraWorkspaceEntitlements.id, entitlementId), eq(userExtraWorkspaceEntitlements.userId, userId)))
    .limit(1);
  if (!entitlement) return { ok: false, error: "Entitlement tidak ditemukan" };
  if (entitlement.status === "cancelled" || entitlement.status === "expired") {
    return { ok: false, error: "Entitlement sudah tidak aktif" };
  }
  if (entitlement.status === "cancel_scheduled") return { ok: true };

  await db
    .update(userExtraWorkspaceEntitlements)
    .set({ status: "cancel_scheduled", autoRenew: false, updatedAt: new Date() })
    .where(eq(userExtraWorkspaceEntitlements.id, entitlement.id));
  return { ok: true };
}

/**
 * Period-end sweep for extra-workspace entitlements. Expiry is TERMINAL:
 * QRIS carries no payment mandate, so the sweep never creates a new period.
 * Two transitions:
 *  1. `active` + ended      → `expired` (slots removed).
 *  2. `cancel_scheduled` + ended → `cancelled` (slots removed).
 *
 * Concurrency safety: due rows are selected with `FOR UPDATE SKIP LOCKED`
 * (parallel sweep runs pick disjoint rows instead of blocking), and each
 * transition is a single conditional UPDATE guarded by the still-due status,
 * so only the winning run counts the transition. Idempotent: a row already
 * transitioned is skipped by the guard.
 *
 * Runs inside the caller's transaction so plan downgrade and entitlement
 * expiry commit atomically.
 */
export async function sweepExtraWorkspaceEntitlementsTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  now: Date = new Date(),
): Promise<{ expired: number; cancelled: number }> {
  const due = await tx
    .select({ id: userExtraWorkspaceEntitlements.id, status: userExtraWorkspaceEntitlements.status })
    .from(userExtraWorkspaceEntitlements)
    .where(
      and(
        sql`${userExtraWorkspaceEntitlements.endsAt} <= ${now.toISOString()}`,
        sql`${userExtraWorkspaceEntitlements.status} IN ('active', 'cancel_scheduled')`,
      ),
    )
    .for("update", { skipLocked: true });

  let expired = 0;
  let cancelled = 0;
  for (const entitlement of due) {
    const target = entitlement.status === "cancel_scheduled" ? "cancelled" : "expired";
    const updated = await tx
      .update(userExtraWorkspaceEntitlements)
      .set({ status: target, updatedAt: now })
      .where(
        and(
          eq(userExtraWorkspaceEntitlements.id, entitlement.id),
          sql`${userExtraWorkspaceEntitlements.endsAt} <= ${now.toISOString()}`,
          sql`${userExtraWorkspaceEntitlements.status} IN ('active', 'cancel_scheduled')`,
        ),
      )
      .returning({ id: userExtraWorkspaceEntitlements.id });
    if (updated.length === 1) {
      if (target === "cancelled") cancelled += 1;
      else expired += 1;
    }
  }
  return { expired, cancelled };
}

/**
 * Workspace slot enforcement for workspace creation: base plan limit plus any
 * active extra-workspace slots. Counts workspaces the user OWNS (plan limit is
 * an ownership limit; membership in other workspaces is not charged).
 */
export async function canCreateWorkspaceWithAddons(
  userId: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; reason?: string; baseLimit: number; extraSlots: number }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const plan = getEffectivePlan(user?.plan, user?.planExpiresAt, now);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId));

  const baseLimit = getPlanLimits(plan).maxWorkspaces;
  const extraSlots = await getActiveExtraWorkspaceSlots(userId, now);

  if (baseLimit > 0 && count >= baseLimit + extraSlots) {
    return {
      allowed: false,
      baseLimit,
      extraSlots,
      reason: plan === "free"
        ? "Free plan cuma bisa 1 workspace. Upgrade ke Solo untuk buat workspace tambahan."
        : `Batas workspace tercapai (${baseLimit}${extraSlots > 0 ? ` + ${extraSlots} tambahan` : ""}). Tambah extra workspace atau upgrade plan untuk membuat workspace baru.`,
    };
  }
  return { allowed: true, baseLimit, extraSlots };
}
