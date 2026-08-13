import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userStorageAddons, users } from "@/db/schema";
import { getEffectivePlan } from "@/lib/plan";
import { getPeriodExpiry, type BillingPeriod } from "@/lib/billing-plans";

export type StorageAddonStatus = "active" | "cancel_scheduled" | "cancelled" | "expired";

/**
 * Sum of active (not yet ended) storage add-on bytes owned by a user.
 * `cancel_scheduled` add-ons still count until their period ends, so
 * cancelling at period end never causes an immediate quota drop.
 */
export async function getActiveStorageAddonBytes(userId: string, now: Date = new Date()): Promise<number> {
  const [row] = await db
    .select({ bytes: sql<number>`coalesce(sum(${userStorageAddons.storageBytes}), 0)` })
    .from(userStorageAddons)
    .where(
      and(
        eq(userStorageAddons.userId, userId),
        sql`${userStorageAddons.status} IN ('active', 'cancel_scheduled')`,
        sql`${userStorageAddons.endsAt} > ${now.toISOString()}`,
      ),
    );
  return Number(row?.bytes ?? 0);
}

/**
 * Active add-on rows for a user (list endpoint / UI).
 */
export async function listActiveStorageAddons(userId: string, now: Date = new Date()) {
  return db
    .select({
      id: userStorageAddons.id,
      storageBytes: userStorageAddons.storageBytes,
      amount: userStorageAddons.amount,
      billingPeriod: userStorageAddons.billingPeriod,
      status: userStorageAddons.status,
      startsAt: userStorageAddons.startsAt,
      endsAt: userStorageAddons.endsAt,
      autoRenew: userStorageAddons.autoRenew,
    })
    .from(userStorageAddons)
    .where(
      and(
        eq(userStorageAddons.userId, userId),
        sql`${userStorageAddons.status} IN ('active', 'cancel_scheduled')`,
        sql`${userStorageAddons.endsAt} > ${now.toISOString()}`,
      ),
    )
    .orderBy(userStorageAddons.endsAt);
}

/**
 * Guard: storage add-ons are purchased per user and follow the user's plan
 * period, so a paid (solo/team, incl. grace) plan must be active.
 */
export async function canPurchaseStorageAddon(
  userId: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; reason?: string }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { allowed: false, reason: "User tidak ditemukan" };

  const plan = getEffectivePlan(user.plan, user.planExpiresAt, now);
  if (plan === "free") {
    return {
      allowed: false,
      reason: "Storage add-on hanya tersedia untuk plan berbayar. Upgrade ke Solo atau Team terlebih dahulu.",
    };
  }
  return { allowed: true };
}

/**
 * Activate a paid storage add-on inside the webhook transaction.
 * Idempotent on `providerEventId` (webhook replay) and `providerOrderId`
 * (same order completing twice): both return the existing entitlement.
 *
 * A fresh entitlement is funded by a single QRIS payment — QRIS cannot be
 * auto-charged, so `autoRenew` is always false. Renewal requires a NEW
 * payment, which creates a new row via this same helper.
 */
export async function activateStorageAddonTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    userId: string;
    storageBytes: number;
    amount: number;
    billingPeriod: BillingPeriod;
    paidAt: Date;
    providerOrderId?: string | null;
    providerEventId?: string | null;
  },
): Promise<{ kind: "created" | "existing"; entitlementId: string }> {
  const existing = input.providerEventId
    ? await tx
        .select({ id: userStorageAddons.id })
        .from(userStorageAddons)
        .where(eq(userStorageAddons.providerEventId, input.providerEventId))
        .limit(1)
    : [];
  if (existing[0]) return { kind: "existing", entitlementId: existing[0].id };

  const byOrder = input.providerOrderId
    ? await tx
        .select({ id: userStorageAddons.id })
        .from(userStorageAddons)
        .where(eq(userStorageAddons.providerOrderId, input.providerOrderId))
        .limit(1)
    : [];
  if (byOrder[0]) return { kind: "existing", entitlementId: byOrder[0].id };

  const startsAt = input.paidAt;
  const endsAt = getPeriodExpiry(startsAt, input.billingPeriod);
  const [inserted] = await tx
    .insert(userStorageAddons)
    .values({
      userId: input.userId,
      storageBytes: input.storageBytes,
      amount: String(input.amount),
      billingPeriod: input.billingPeriod,
      status: "active",
      startsAt,
      endsAt,
      autoRenew: false,
      providerOrderId: input.providerOrderId ?? null,
      providerEventId: input.providerEventId ?? null,
    })
    .returning({ id: userStorageAddons.id });
  return { kind: "created", entitlementId: inserted.id };
}

/**
 * Schedule cancellation at period end: the add-on stays active (bytes still
 * count toward quota) until `ends_at`, then the expiry sweep flips it to
 * `cancelled`. Idempotent — repeating the cancel returns the same result.
 */
export async function cancelStorageAddon(
  addonId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const [addon] = await db
    .select()
    .from(userStorageAddons)
    .where(and(eq(userStorageAddons.id, addonId), eq(userStorageAddons.userId, userId)))
    .limit(1);
  if (!addon) return { ok: false, error: "Add-on tidak ditemukan" };
  if (addon.status === "cancelled" || addon.status === "expired") {
    return { ok: false, error: "Add-on sudah tidak aktif" };
  }
  if (addon.status === "cancel_scheduled") return { ok: true };

  await db
    .update(userStorageAddons)
    .set({ status: "cancel_scheduled", autoRenew: false, updatedAt: new Date() })
    .where(eq(userStorageAddons.id, addon.id));
  return { ok: true };
}

/**
 * Period-end sweep for storage add-ons. Expiry is TERMINAL: QRIS carries no
 * payment mandate, so the sweep never creates a new period. Two transitions:
 *  1. `active` + ended      → `expired` (bytes removed).
 *  2. `cancel_scheduled` + ended → `cancelled` (bytes removed).
 *
 * Concurrency safety: due rows are selected with `FOR UPDATE SKIP LOCKED`
 * (parallel sweep runs pick disjoint rows instead of blocking), and each
 * transition is a single conditional UPDATE guarded by the still-due status,
 * so only the winning run counts the transition. Idempotent: a row already
 * transitioned is skipped by the guard.
 *
 * Runs inside the caller's transaction so plan downgrade and add-on expiry
 * commit atomically.
 */
export async function sweepStorageAddonsTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  now: Date = new Date(),
): Promise<{ expired: number; cancelled: number }> {
  const due = await tx
    .select({ id: userStorageAddons.id, status: userStorageAddons.status })
    .from(userStorageAddons)
    .where(
      and(
        sql`${userStorageAddons.endsAt} <= ${now.toISOString()}`,
        sql`${userStorageAddons.status} IN ('active', 'cancel_scheduled')`,
      ),
    )
    .for("update", { skipLocked: true });

  let expired = 0;
  let cancelled = 0;
  for (const addon of due) {
    const target = addon.status === "cancel_scheduled" ? "cancelled" : "expired";
    const updated = await tx
      .update(userStorageAddons)
      .set({ status: target, updatedAt: now })
      .where(
        and(
          eq(userStorageAddons.id, addon.id),
          sql`${userStorageAddons.endsAt} <= ${now.toISOString()}`,
          sql`${userStorageAddons.status} IN ('active', 'cancel_scheduled')`,
        ),
      )
      .returning({ id: userStorageAddons.id });
    if (updated.length === 1) {
      if (target === "cancelled") cancelled += 1;
      else expired += 1;
    }
  }
  return { expired, cancelled };
}

/**
 * Period-end sweep for storage add-ons, standalone (cron entry point).
 * Runs inside a single transaction so expirations and cancellations commit
 * atomically with each other.
 */
export async function sweepStorageAddons(now: Date = new Date()): Promise<{ expired: number; cancelled: number }> {
  return db.transaction(async (tx) => sweepStorageAddonsTx(tx, now));
}
