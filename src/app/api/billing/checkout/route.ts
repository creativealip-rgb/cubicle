import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, users, workspaceMembers } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";
import { assertSameOrigin } from "@/lib/same-origin";
import { getEffectivePlan } from "@/lib/plan";
import { canPurchaseStorageAddon } from "@/lib/storage-addons";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
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
  const period = String(body.period || "yearly").toLowerCase() as BillingPeriod;
  if (period !== "monthly" && period !== "yearly") {
    return NextResponse.json({ error: "Periode billing tidak valid." }, { status: 400 });
  }

  // Storage add-on purchase: buy extra GB for the current plan period without
  // touching the plan itself. The addon key is persisted on the payment row so
  // the webhook can create the entitlement idempotently on payment completion.
  // Branch on the PRESENCE of `addon` BEFORE parsing `plan` so an add-on
  // checkout never requires a plan field, and a plan checkout is never
  // mistaken for an add-on checkout.
  const addonRaw = body.addon ?? null;
  if (addonRaw !== null) {
    if (!isStorageAddonKey(addonRaw)) {
      return NextResponse.json({ error: "Ukuran add-on tidak valid. Pilih 5, 10, atau 15 GB." }, { status: 400 });
    }
    const addon = addonRaw as StorageAddonKey;

    // Storage add-ons are per-user entitlements, but checkout is billed to
    // the workspace owner. Only the authenticated current-workspace OWNER may
    // start a payment — members/viewers are rejected before the provider call.
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

    const purchaseCheck = await canPurchaseStorageAddon(session.user.id);
    if (!purchaseCheck.allowed) {
      return NextResponse.json({ error: purchaseCheck.reason }, { status: 409 });
    }

    // The payment row's `plan` column is NOT NULL with a solo|team enum, but an
    // add-on checkout carries no `plan` field (it never touches the plan).
    // Persist the buyer's current plan label instead; the guard above already
    // proved a paid plan is active, so this is solo or team.
    const [planOwner] = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const addonPlan = (planOwner?.plan ?? "free") as BillingPlan;
    if (addonPlan === "free") {
      return NextResponse.json({ error: "Storage add-on hanya tersedia untuk plan berbayar." }, { status: 409 });
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
        plan: addonPlan,
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

  // Plan purchase: `plan` is parsed only in this branch so add-on checkouts
  // never require it, and plan checkouts are not intercepted by the add-on
  // branch above.
  const plan = String(body.plan || "").toLowerCase();
  if (!isBillingPlan(plan)) {
    return NextResponse.json({ error: "Plan tidak valid. Pilih solo atau team." }, { status: 400 });
  }
  if (plan === "free") {
    return NextResponse.json({ error: "Plan free tidak butuh pembayaran." }, { status: 400 });
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

  const effectivePlan = getEffectivePlan(user.plan, user.planExpiresAt);
  const now = new Date();

  if (effectivePlan === plan) {
    return NextResponse.json(
      { error: `Kamu sudah di plan ${BILLING_PLANS[plan].label}` },
      { status: 409 },
    );
  }

  if (!isUpgrade(effectivePlan, plan)) {
    if (effectivePlan !== "free" && user.planExpiresAt && user.planExpiresAt > now) {
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
      paymentType: "plan",
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
