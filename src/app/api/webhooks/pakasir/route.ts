import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pakasirPayments } from "@/db/schema";
import { getPakasirTransactionDetail, pakasirProject, type PakasirWebhook } from "@/lib/pakasir";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { activateCompletedPakasirPayment } from "@/lib/pakasir-sync";

export async function POST(request: Request) {
  const limited = await enforceRateLimitResponse(request, "webhook:pakasir", { limit: 120, windowSec: 60 });
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as PakasirWebhook | null;
  if (!body?.order_id || !body.amount || !body.project) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const expectedProject = pakasirProject();
  if (expectedProject && body.project !== expectedProject) {
    return NextResponse.json({ error: "Project mismatch" }, { status: 403 });
  }

  const [payment] = await db
    .select()
    .from(pakasirPayments)
    .where(eq(pakasirPayments.orderId, body.order_id))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const amount = Math.round(Number(payment.amount));
  if (Number(body.amount) !== amount) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Fail-closed verification: only trust the status re-fetched from Pakasir,
  // NEVER the raw webhook body. A forged webhook with status:"completed" must
  // not be able to activate a plan when Pakasir itself has no such transaction.
  const detail = await getPakasirTransactionDetail({ orderId: payment.orderId, amount });
  const verifiedStatus = detail.transaction?.status;
  if (!verifiedStatus) {
    await db
      .update(pakasirPayments)
      .set({ rawPayload: body, updatedAt: new Date() })
      .where(eq(pakasirPayments.id, payment.id));
    return NextResponse.json(
      { error: "Unverified transaction" },
      { status: 402 },
    );
  }
  if (verifiedStatus !== "completed") {
    await db
      .update(pakasirPayments)
      .set({ rawPayload: body, updatedAt: new Date() })
      .where(eq(pakasirPayments.id, payment.id));
    return NextResponse.json({ ok: true, ignored: true, status: verifiedStatus });
  }

  const paidAt = body.completed_at ? new Date(body.completed_at) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Invalid completion time" }, { status: 400 });
  }

  // Activation is delegated to the shared helper in src/lib/pakasir-sync.ts —
  // the SAME row-locked, idempotent transaction the missed-webhook recovery
  // cron uses, so webhook and cron can never diverge (plan / storage add-on /
  // extra-workspace activation, provider order/event idempotency keys, and the
  // pending->completed conditional update all live in one place).
  const result = await activateCompletedPakasirPayment(payment.id, {
    orderId: payment.orderId,
    amount,
    paidAt,
    rawPayload: body,
  });

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (result.kind === "mismatch") {
    return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
  }
  if (result.kind === "owner_not_found") {
    return NextResponse.json({ error: "Workspace owner not found" }, { status: 409 });
  }
  if (result.kind === "idempotent") {
    return NextResponse.json({ ok: true, idempotent: true });
  }
  if (result.kind === "ignored") {
    return NextResponse.json({ ok: true, ignored: true, status: result.status });
  }
  if (result.kind === "addon_activated") {
    return NextResponse.json({ ok: true, activated: true, entitlementId: result.entitlementId });
  }
  return NextResponse.json({ ok: true, activated: true, plan: result.plan });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "pakasir" });
}
