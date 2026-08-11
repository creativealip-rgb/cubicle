import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, workspaceMembers } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";
import { assertSameOrigin } from "@/lib/same-origin";
import { getExtraWorkspaceAmount, type BillingPeriod } from "@/lib/billing-plans";
import { canPurchaseExtraWorkspace } from "@/lib/extra-workspace";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Browser-only endpoint: reject cross-origin POSTs (CSRF) before any
  // provider work. Origin is compared against NEXT_PUBLIC_APP_URL (or Host as
  // fallback), so a drive-by form on an attacker site cannot start a Pakasir
  // checkout for the victim's account.
  try {
    assertSameOrigin(request, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      devOrigin: "https://dev.cubiqlo.com",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Extra-workspace checkout is billed to the workspace owner. Reject any
  // member/viewer before touching the provider or creating a payment row.
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);

  if (!membership?.workspaceId) {
    return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
  }
  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Hanya pemilik workspace yang dapat melakukan pembayaran." }, { status: 403 });
  }

  if (!isPakasirConfigured()) {
    return NextResponse.json({ error: "Pakasir belum dikonfigurasi" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const period = String(body.period || "yearly").toLowerCase() as BillingPeriod;
  if (period !== "monthly" && period !== "yearly") {
    return NextResponse.json({ error: "Periode billing tidak valid." }, { status: 400 });
  }

  // Team-only add-on. Requires an active (or grace-period) Team plan.
  const purchaseCheck = await canPurchaseExtraWorkspace(session.user.id);
  if (!purchaseCheck.allowed) {
    return NextResponse.json({ error: purchaseCheck.reason }, { status: 409 });
  }

  const amount = getExtraWorkspaceAmount(period);
  const shortWs = membership.workspaceId.replace(/-/g, "").slice(0, 10).toUpperCase();
  // Random suffix prevents order ID collisions on same-ms double checkout
  // (order_id is UNIQUE on pakasir_payments).
  const orderId = `CUB-${shortWs}-WSX-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    const payment = await createPakasirTransaction({ orderId, amount, method: "qris" });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://cubiqlo.com").replace(/\/$/, "");
    const redirectUrl = `${appUrl}/app/billing?checkout=${encodeURIComponent(orderId)}`;
    const paymentUrl = pakasirPaymentUrl({
      project: payment.project,
      amount: payment.amount,
      orderId: payment.order_id,
      redirectUrl,
    });

    await db.insert(pakasirPayments).values({
      workspaceId: membership.workspaceId,
      orderId,
      plan: "team",
      billingPeriod: period,
      paymentType: "extra_workspace",
      amount: String(amount),
      status: "pending",
      rawPayload: payment,
    });

    return NextResponse.json({
      success: true,
      data: { orderId, addon: "extra_workspace", quantity: 1, amount, paymentUrl },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pembayaran" },
      { status: 502 },
    );
  }
}
