import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pakasirPayments, users, workspaces } from "@/db/schema";
import { getPakasirTransactionDetail, pakasirProject, type PakasirWebhook } from "@/lib/pakasir";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";

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
  const expiresAt = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id FROM pakasir_payments
      WHERE id = ${payment.id}
      FOR UPDATE
    `);
    if (locked.rowCount === 0) return { kind: "not_found" as const };

    const [current] = await tx
      .select()
      .from(pakasirPayments)
      .where(eq(pakasirPayments.id, payment.id))
      .limit(1);
    if (!current) return { kind: "not_found" as const };
    if (current.status === "completed") {
      return { kind: "idempotent" as const, plan: current.plan };
    }
    if (current.status !== "pending") {
      return { kind: "ignored" as const, status: current.status };
    }
    if (current.orderId !== body.order_id || Math.round(Number(current.amount)) !== Number(body.amount)) {
      return { kind: "mismatch" as const };
    }

    const [workspace] = await tx
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, current.workspaceId))
      .limit(1);
    if (!workspace?.ownerId) return { kind: "owner_not_found" as const };

    await tx
      .update(users)
      .set({ plan: current.plan, planExpiresAt: expiresAt })
      .where(eq(users.id, workspace.ownerId));

    const completed = await tx
      .update(pakasirPayments)
      .set({
        status: "completed",
        rawPayload: body,
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

  revalidatePath("/app/billing");
  return NextResponse.json({ ok: true, activated: true, plan: result.plan });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "pakasir" });
}
