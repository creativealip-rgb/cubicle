import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pakasirPayments, workspaceMembers } from "@/db/schema";

/**
 * Checkout status shown on the billing page after a Pakasir redirect.
 *
 * Only ever derived from the DB row (never the raw provider payload), and the
 * page only queries the payment row that belongs to the CURRENT workspace.
 * `expired` is not yet a DB enum value (webhook rows stay `pending` until a
 * provider-confirmed completion), but the provider can report it — mapping it
 * here keeps the UI safe for that transition without touching the webhook.
 */
export type CheckoutStatus = "pending" | "completed" | "failed" | "expired" | "unknown";

export function mapCheckoutStatus(status: string | null | undefined): CheckoutStatus {
  switch (status) {
    case "pending":
    case "completed":
    case "failed":
    case "expired":
      return status;
    default:
      return "unknown";
  }
}

/**
 * Fetch the status of a checkout order for the CURRENT WORKSPACE OWNER only.
 *
 * - Returns `null` when the caller is not the workspace owner (members and
 *   viewers never see payment status).
 * - Returns `null` when the order id does not belong to the current workspace,
 *   so an order id from another workspace cannot be probed.
 * - Returns `null` when there is no order id at all.
 *
 * The owner gate runs BEFORE the `pakasir_payments` query, so non-owners never
 * trigger a payment-row lookup. Never returns the raw provider payload.
 */
export async function getCheckoutStatusForWorkspaceOwner(params: {
  userId: string;
  workspaceId: string;
  orderId: string | undefined;
}): Promise<{ status: CheckoutStatus; amount: string | null } | null> {
  if (!params.orderId) return null;

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, params.userId),
        eq(workspaceMembers.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);
  if (member?.role !== "owner") return null;

  const [payment] = await db
    .select({ status: pakasirPayments.status, amount: pakasirPayments.amount })
    .from(pakasirPayments)
    .where(
      and(
        eq(pakasirPayments.orderId, params.orderId),
        eq(pakasirPayments.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);
  if (!payment) return null;

  return { status: mapCheckoutStatus(payment.status), amount: payment.amount };
}
