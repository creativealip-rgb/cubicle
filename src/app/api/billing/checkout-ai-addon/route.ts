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
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { AI_REQUESTS_ADDON } from "@/lib/billing-plans";

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

  if (!isPakasirConfigured()) {
    return NextResponse.json({ error: "Pakasir belum dikonfigurasi" }, { status: 503 });
  }

  const userId = session.user.id;
  const user = await db
    .select({
      id: users.id,
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const effectivePlan = getEffectivePlan(user.plan, user.planExpiresAt);
  const workspaceId = await getWorkspaceForCurrentUser();

  const [membership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Hanya workspace owner yang dapat membeli add-on." },
      { status: 403 },
    );
  }

  const amount = AI_REQUESTS_ADDON.amount;
  const shortWs = workspaceId.replace(/-/g, "").slice(0, 10).toUpperCase();
  const orderId = `CUB-${shortWs}-AI-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

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
      workspaceId,
      orderId,
      plan: effectivePlan === "free" ? "solo" : (effectivePlan as "solo" | "team"),
      billingPeriod: "yearly",
      paymentType: "plan",
      entitlementRef: "ai_1000",
      amount: String(amount),
      status: "pending",
      rawPayload: payment,
    });

    return NextResponse.json({
      success: true,
      data: { orderId, addon: "ai_1000", amount, paymentUrl },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pembayaran" },
      { status: 502 },
    );
  }
}
