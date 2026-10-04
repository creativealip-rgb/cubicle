import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, workspaceMembers } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";
import { assertSameOrigin } from "@/lib/same-origin";
import {
  getExtraMemberAddonAmount,
  isExtraMemberAddonKey,
  type ExtraMemberAddonKey,
  type BillingPeriod,
} from "@/lib/billing-plans";
import { canPurchaseExtraMember } from "@/lib/extra-members";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertSameOrigin(request, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      devOrigin: "https://dev.cubiqlo.com",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeWsId = await getWorkspaceForCurrentUser();
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.workspaceId, activeWsId),
      ),
    )
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
  const quantity = Number(body.quantity || 1) as ExtraMemberAddonKey;
  if (!isExtraMemberAddonKey(quantity)) {
    return NextResponse.json({ error: "Jumlah anggota tidak valid (pilih 1, 3, atau 5)." }, { status: 400 });
  }

  const period: BillingPeriod = "yearly";

  const purchaseCheck = await canPurchaseExtraMember(session.user.id);
  if (!purchaseCheck.allowed) {
    return NextResponse.json({ error: purchaseCheck.reason }, { status: 409 });
  }

  const amount = getExtraMemberAddonAmount(quantity);
  const orderId = `cb_mbr_${Date.now()}_${randomBytes(4).toString("hex")}`;

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
      paymentType: "extra_member",
      entitlementRef: String(quantity),
      amount: String(amount),
      status: "pending",
      paymentMethod: "PAKASIR_QRIS",
      rawPayload: payment as unknown as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      data: { orderId, addon: "extra_member", quantity, amount, paymentUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat transaksi Pakasir";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
