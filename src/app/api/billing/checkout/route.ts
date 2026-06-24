import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, workspaceMembers, workspaces } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";

const PLANS = {
  solo: { amount: 49000, label: "Solo" },
  team: { amount: 99000, label: "Team" },
} as const;

type Plan = keyof typeof PLANS;

function isPlan(value: unknown): value is Plan {
  return value === "solo" || value === "team";
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPakasirConfigured()) {
    return NextResponse.json({ error: "Pakasir belum dikonfigurasi" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = String(body.plan || "").toLowerCase();
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Plan tidak valid. Pilih solo atau team." }, { status: 400 });
  }

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);

  if (!membership?.workspaceId) {
    return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
  }
  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Hanya owner workspace yang bisa upgrade" }, { status: 403 });
  }

  const [workspace] = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      plan: workspaces.plan,
      planExpiresAt: workspaces.planExpiresAt,
    })
    .from(workspaces)
    .where(and(eq(workspaces.id, membership.workspaceId), eq(workspaces.ownerId, session.user.id)))
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace owner mismatch" }, { status: 403 });
  }

  const now = new Date();
  if (workspace.plan === plan) {
    return NextResponse.json(
      { error: `Workspace sudah di plan ${PLANS[plan].label}` },
      { status: 409 },
    );
  }

  if (workspace.plan !== "free" && workspace.planExpiresAt && workspace.planExpiresAt > now) {
    return NextResponse.json(
      { error: "Plan aktif belum expired. Upgrade/downgrade belum tersedia." },
      { status: 409 },
    );
  }

  const amount = PLANS[plan].amount;
  const shortWs = workspace.id.replace(/-/g, "").slice(0, 10).toUpperCase();
  const orderId = `CUB-${shortWs}-${plan.toUpperCase()}-${Date.now()}`;

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
      workspaceId: workspace.id,
      orderId,
      plan,
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
