import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pakasirPayments, users, workspaces } from "@/db/schema";
import { getPakasirTransactionDetail, type PakasirWebhook } from "@/lib/pakasir";
import { getPeriodExpiry } from "@/lib/billing-plans";
import { activateExtraWorkspaceEntitlementTx } from "@/lib/extra-workspace";
import { activateStorageAddonTx } from "@/lib/storage-addons";

export type PakasirActivationResult =
  | { kind: "activated"; plan: string }
  | { kind: "addon_activated"; plan: string; entitlementId: string }
  | { kind: "idempotent"; plan: string; entitlementId?: string }
  | { kind: "ignored"; status: string }
  | { kind: "not_found" }
  | { kind: "mismatch" }
  | { kind: "owner_not_found" };

/**
 * Shared, single source of truth for completing a Pakasir payment.
 *
 * Used by BOTH the live webhook (`src/app/api/webhooks/pakasir/route.ts`) and the
 * missed-webhook recovery cron (`src/app/api/cron/pakasir-sync/route.ts`) so the
 * two paths can never diverge:
 *
 * - Row-locks the payment row (`SELECT ... FOR UPDATE`) before re-reading status,
 *   so concurrent webhook replay and cron recovery serialize instead of racing.
 * - Idempotent: a payment already `completed` returns `{ kind: "idempotent" }`
 *   without touching users/entitlements; the pending→completed UPDATE is
 *   conditional on `status = 'pending'` so two completions cannot double-activate.
 * - Activates plan (workspace owner), storage add-on, or extra-workspace
 *   entitlement using the SAME tx helpers and idempotency keys
 *   (`providerOrderId` = payment order id, `providerEventId` = webhook event
 *   order id) as the original webhook path. Payment type / entitlement key /
 *   billing period are read from the locked DB row, never from the payload.
 *
 * Callers must verify the provider transaction first (fail-closed
 * `getPakasirTransactionDetail` + `status === "completed"` + amount match) — this
 * helper trusts only the DB row and the caller-supplied verified payload.
 *
 * Throws on DB errors so the caller can decide isolation policy (webhook → 4xx;
 * cron → skip this payment, continue).
 */
export async function activateCompletedPakasirPayment(
  paymentId: string,
  input: {
    orderId: string;
    amount: number;
    paidAt: Date;
    rawPayload: PakasirWebhook;
  },
): Promise<PakasirActivationResult> {
  const { orderId, amount, paidAt, rawPayload } = input;

  const result = await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id FROM pakasir_payments
      WHERE id = ${paymentId}
      FOR UPDATE
    `);
    if (locked.rowCount === 0) return { kind: "not_found" as const };

    const [current] = await tx
      .select()
      .from(pakasirPayments)
      .where(eq(pakasirPayments.id, paymentId))
      .limit(1);
    if (!current) return { kind: "not_found" as const };
    if (current.status === "completed") {
      return { kind: "idempotent" as const, plan: current.plan, entitlementId: current.entitlementRef ?? undefined };
    }
    if (current.status !== "pending") {
      return { kind: "ignored" as const, status: current.status };
    }
    if (current.orderId !== orderId || Math.round(Number(current.amount)) !== amount) {
      return { kind: "mismatch" as const };
    }

    const [workspace] = await tx
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, current.workspaceId))
      .limit(1);
    if (!workspace?.ownerId) return { kind: "owner_not_found" as const };

    const expiresAt = getPeriodExpiry(paidAt, current.billingPeriod);

    // Add-on purchases (storage / extra workspace) reuse the same payment row.
    // The addon/entitlement key is persisted on the pending row, so replay/dedup
    // works exactly like plan activation: provider order_id uniqueness + the
    // pending->completed conditional update. A payment that was already handled
    // returns idempotent before any entitlement write is attempted.
    const storageAddonKey = current.paymentType === "storage_addon" ? current.entitlementRef : null;
    const extraWorkspace = current.paymentType === "extra_workspace";

    // Storage add-on: create the entitlement once (provider order/event ID
    // uniqueness guards replay), then mark the payment completed.
    if (storageAddonKey) {
      const activated = await activateStorageAddonTx(tx, {
        userId: workspace.ownerId,
        storageBytes: Number(storageAddonKey) * 1024 ** 3,
        amount: Math.round(Number(current.amount)),
        billingPeriod: current.billingPeriod,
        paidAt,
        providerOrderId: current.orderId,
        providerEventId: orderId,
      });
      if (activated.kind === "existing") {
        return { kind: "idempotent" as const, plan: current.plan, entitlementId: activated.entitlementId };
      }
      await tx
        .update(pakasirPayments)
        .set({
          status: "completed",
          rawPayload,
          paidAt,
          updatedAt: new Date(),
        })
        .where(eq(pakasirPayments.id, current.id));
      return { kind: "addon_activated" as const, plan: current.plan, entitlementId: activated.entitlementId };
    }

    // Extra-workspace add-on: create/refresh the entitlement but do not touch
    // the plan.
    if (extraWorkspace) {
      const activated = await activateExtraWorkspaceEntitlementTx(tx, {
        userId: workspace.ownerId,
        quantity: 1,
        amount: Number(current.amount),
        billingPeriod: current.billingPeriod,
        paidAt,
        providerOrderId: current.orderId,
        providerEventId: orderId,
      });
      if (activated.kind === "existing") {
        return { kind: "idempotent" as const, plan: current.plan, entitlementId: activated.entitlementId };
      }
      await tx
        .update(pakasirPayments)
        .set({
          status: "completed",
          rawPayload,
          paidAt,
          updatedAt: new Date(),
        })
        .where(eq(pakasirPayments.id, current.id));
      return { kind: "activated" as const, plan: current.plan, entitlementId: activated.entitlementId };
    }

    // Plan payment: activate the plan for the workspace owner.
    await tx
      .update(users)
      .set({ plan: current.plan, planExpiresAt: expiresAt })
      .where(eq(users.id, workspace.ownerId));

    const completed = await tx
      .update(pakasirPayments)
      .set({
        status: "completed",
        rawPayload,
        paidAt,
        updatedAt: new Date(),
      })
      .where(and(
        eq(pakasirPayments.id, current.id),
        eq(pakasirPayments.status, "pending"),
      ))
      .returning({ id: pakasirPayments.id });
    if (completed.length !== 1) return { kind: "idempotent" as const, plan: current.plan };

    return { kind: "activated" as const, plan: current.plan };
  });

  if (result.kind === "activated" || result.kind === "addon_activated") {
    revalidatePath("/app/billing");
  }
  return result;
}

/**
 * Missed-webhook recovery: re-fetch the provider detail for a pending payment
 * (fail-closed) and, when the provider says it is completed, activate it via the
 * shared `activateCompletedPakasirPayment` helper.
 *
 * Returns a summary of what happened so the cron can report per-payment outcomes.
 * Throws if the provider is unreachable or the DB write fails — the caller
 * (cron route / batch loop) catches and isolates so one bad payment never
 * blocks the rest.
 */
export async function processPakasirPayment(paymentId: string) {
  const [payment] = await db
    .select()
    .from(pakasirPayments)
    .where(eq(pakasirPayments.id, paymentId))
    .limit(1);

  if (!payment) {
    return { orderId: paymentId, outcome: "not_found" as const };
  }
  if (payment.status === "completed") {
    return { orderId: payment.orderId, outcome: "idempotent" as const };
  }

  const amount = Math.round(Number(payment.amount));
  const detail = await getPakasirTransactionDetail({ orderId: payment.orderId, amount });
  const verifiedStatus = detail.transaction?.status;

  // Fail-closed: only a provider-confirmed "completed" status may activate.
  if (!verifiedStatus || verifiedStatus !== "completed") {
    return {
      orderId: payment.orderId,
      outcome: "ignored" as const,
      status: verifiedStatus ?? null,
    };
  }

  // Verified completed — narrow the possibly-undefined transaction reference
  // for the callers below. (TS cannot infer this from the verifiedStatus guard.)
  const transaction = detail.transaction;
  if (!transaction) {
    return { orderId: payment.orderId, outcome: "ignored" as const, status: verifiedStatus };
  }
  const paidAt = transaction.completed_at
    ? new Date(transaction.completed_at)
    : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { orderId: payment.orderId, outcome: "ignored" as const, status: verifiedStatus };
  }

  const result = await activateCompletedPakasirPayment(payment.id, {
    orderId: payment.orderId,
    amount,
    paidAt,
    rawPayload: transaction,
  });

  return {
    orderId: payment.orderId,
    outcome: result.kind,
    plan: result.kind === "activated" || result.kind === "addon_activated" ? result.plan : undefined,
  };
}

export type PakasirSyncReport = {
  scanned: number;
  activated: number;
  idempotent: number;
  ignored: number;
  errored: number;
  processed: Array<{
    orderId: string;
    outcome: string;
    status?: string | null;
    plan?: string;
    error?: string;
  }>;
};

/**
 * Scan pending payments (bounded by `limit`, oldest first) and attempt to
 * complete each one via the provider. A provider/DB failure on one payment is
 * caught and recorded so the rest of the batch still runs.
 */
export async function syncPendingPakasirPayments(limit = 25): Promise<PakasirSyncReport> {
  const pending = await db
    .select()
    .from(pakasirPayments)
    .where(eq(pakasirPayments.status, "pending"))
    .orderBy(pakasirPayments.createdAt)
    .limit(limit);

  const processed: PakasirSyncReport["processed"] = [];
  for (const payment of pending) {
    try {
      const result = await processPakasirPayment(payment.id);
      processed.push(result);
    } catch (err) {
      // Isolate: one failed payment must not block the rest of the batch.
      processed.push({
        orderId: payment.orderId,
        outcome: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const summarize = (outcome: string) => processed.filter((r) => r.outcome === outcome).length;
  return {
    scanned: pending.length,
    activated: summarize("activated") + summarize("addon_activated"),
    idempotent: summarize("idempotent"),
    ignored: summarize("ignored"),
    errored: summarize("error"),
    processed,
  };
}
