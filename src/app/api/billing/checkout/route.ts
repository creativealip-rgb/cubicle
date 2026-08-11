import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, users, workspaceMembers } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";
import { assertSameOrigin } from "@/lib/same-origin";
import { canPurchaseStorageAddon } from "@/lib/storage-addons";
import {
  BILLING_PLANS,
  getPlanAmount,
  getStorageAddonAmount,
  isBillingPlan,
  isStorageAddonKey,
  type BillingPeriod,
  type BillingPlan,
  type StorageAddonKey,
} from "@/lib/billing-plans";

const PLAN_RANK: Record<BillingPlan, number> = {
  free: 0,
  solo: 1,
  team: 2,
};

function isUpgrade(current: BillingPlan, target: BillingPlan) {
  return PLAN_RANK[target] > PLAN_RANK[current];
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Browser-only endpoint: reject cross-origin POSTs (CSRF). Origin is
  // compared against NEXT_PUBLIC_APP_URL (or Host as fallback), so a
  // drive-by form on an attacker site cannot start a Pakasir checkout.
  try {
    assertSameOrigin(request, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      devOrigin: "https://dev.cubiqlo.com",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isPakasirConfigured()) {
    return NextResponse.json({ error: "Pakasir belum dikonfigurasi" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = String(body.plan || "").toLowerCase();
  const period = String(body.period || "yearly").toLowerCase() as BillingPeriod;
  if (period !== "monthly" && period !== "yearly") {
    return NextResponse.json({ error: "Periode billing tidak valid." }, { status: 400 });
  }
  if (!isBillingPlan(plan)) {
    return NextResponse.json({ error: "Plan tidak valid. Pilih solo atau team." }, { status: 400 });
  }
  if (plan === "free") {
    return NextResponse.json({ error: "Plan free tidak butuh pembayaran." }, { status: 400 });
  }

  // Storage add-on purchase: buy extra GB for the current plan period without
  // touching the plan itself. The addon key is persisted on the payment row so
  // the webhook can create the entitlement idempotently on payment completion.
  const addonRaw = body.addon ?? null;
  if (addonRaw !== null) {
    if (!isStorageAddonKey(addonRaw)) {
      return NextResponse.json({ error: "Ukuran add-on tidak valid. Pilih 5, 10, atau 15 GB." }, { status: 400 });
    }
    const addon = addonRaw as StorageAddonKey;

    // Storage add-ons are per-user entitlements, but checkout is billed to
    // the workspace owner. Only the authenticated current-workspace OWNER may
    // start a payment — members/viewers are rejected before the provider call.
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

    const purchaseCheck = await canPurchaseStorageAddon(session.user.id);
    if (!purchaseCheck.allowed) {
      return NextResponse.json({ error: purchaseCheck.reason }, { status: 409 });
    }

    const amount = getStorageAddonAmount(addon, period);
    const shortWs = membership.workspaceId.replace(/-/g, "").slice(0, 10).toUpperCase();
    // Random suffix prevents order ID collisions on same-ms double checkout
    // (order_id is UNIQUE on pakasir_payments and is the payment identity at
    // Pakasir).
    const orderId = `CUB-${shortWs}-GB${addon}-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

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
        plan,
        billingPeriod: period,
        paymentType: "storage_addon",
        entitlementRef: String(addon),
        amount: String(amount),
        status: "pending",
        rawPayload: payment,
      });

      return NextResponse.json({
        success: true,
        data: { orderId, addon: Number(addon), amount, paymentUrl },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Gagal membuat pembayaran" },
        { status: 502 },
      );
    }
  }

  // Get user plan
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const currentPlan = (user.plan ?? "free") as BillingPlan;
  const now = new Date();

  if (currentPlan === plan) {
    return NextResponse.json(
      { error: `Kamu sudah di plan ${BILLING_PLANS[plan].label}` },
      { status: 409 },
    );
  }

  if (!isUpgrade(currentPlan, plan)) {
    if (currentPlan !== "free" && user.planExpiresAt && user.planExpiresAt > now) {
      return NextResponse.json(
        { error: "Downgrade belum tersedia. Plan aktif masih berjalan." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Hanya upgrade ke plan lebih tinggi yang diizinkan." },
      { status: 409 },
    );
  }

  // Still need a workspace for orderId generation and payment record
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

  const amount = getPlanAmount(plan as Exclude<BillingPlan, "free">, period);
  const shortWs = membership.workspaceId.replace(/-/g, "").slice(0, 10).toUpperCase();
  // Random suffix prevents order ID collisions when the same user/plan is
  // checked out twice within the same millisecond (order_id is UNIQUE on
  // pakasir_payments and is the payment identity at Pakasir).
  const orderId = `CUB-${shortWs}-${plan.toUpperCase()}-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

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
      plan,
      billingPeriod: period,
      amount: String(amount),
      status: "pending",
      rawPayload: payment,
    });

    return NextResponse.json({
      success: true,
      data: { orderId, plan, amount, paymentUrl },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pembayaran" },
      { status: 502 },
    );
  }
}
