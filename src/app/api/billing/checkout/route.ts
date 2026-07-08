import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pakasirPayments, workspaceMembers, workspaces } from "@/db/schema";
import { createPakasirTransaction, isPakasirConfigured, pakasirPaymentUrl } from "@/lib/pakasir";

const PLANS = {
  free: { amount: 0, label: "Free" },
  solo: { amount: 49000, label: "Solo" },
  team: { amount: 99000, label: "Team" },
} as const;

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  solo: 1,
  team: 2,
};

type Plan = keyof typeof PLANS;

function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "solo" || value === "team";
}

function isUpgrade(current: Plan, target: Plan) {
  return PLAN_RANK[target] > PLAN_RANK[current];
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
  const targetWorkspaceId = body.workspaceId ? String(body.workspaceId) : null;
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Plan tidak valid. Pilih solo atau team." }, { status: 400 });
  }
  if (plan === "free") {
    return NextResponse.json({ error: "Plan free tidak butuh pembayaran." }, { status: 400 });
  }

  // Get membership — either for specific workspace or first one
  const membershipQuery = targetWorkspaceId
    ? await db
        .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.userId, session.user.id), eq(workspaceMembers.workspaceId, targetWorkspaceId)))
        .limit(1)
    : await db
        .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, session.user.id))
        .limit(1);

  const [membership] = membershipQuery;

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

  const currentPlan = (workspace.plan ?? "free") as Plan;
  const now = new Date();

  if (currentPlan === plan) {
    return NextResponse.json(
      { error: `Workspace sudah di plan ${PLANS[plan].label}` },
      { status: 409 },
    );
  }

  if (!isUpgrade(currentPlan, plan)) {
    if (currentPlan !== "free" && workspace.planExpiresAt && workspace.planExpiresAt > now) {
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
