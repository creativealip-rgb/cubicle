import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pakasirPayments, users, workspaces } from "@/db/schema";
import { getPakasirTransactionDetail, pakasirProject, type PakasirWebhook } from "@/lib/pakasir";

export async function POST(request: Request) {
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

  const detail = await getPakasirTransactionDetail({ orderId: payment.orderId, amount });
  const status = detail.transaction?.status ?? body.status;
  if (status !== "completed") {
    await db
      .update(pakasirPayments)
      .set({ rawPayload: body, updatedAt: new Date() })
      .where(eq(pakasirPayments.id, payment.id));
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  const paidAt = body.completed_at ? new Date(body.completed_at) : new Date();
  const expiresAt = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update the workspace OWNER's plan (user-level, not workspace-level)
  const [workspace] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, payment.workspaceId))
    .limit(1);

  if (workspace?.ownerId) {
    await db.update(users).set({
      plan: payment.plan,
      planExpiresAt: expiresAt,
    }).where(eq(users.id, workspace.ownerId));
    revalidatePath("/app/billing");
  }

  await db.update(pakasirPayments).set({
    status: "completed",
    rawPayload: body,
    paidAt,
    updatedAt: new Date(),
  }).where(eq(pakasirPayments.id, payment.id));

  return NextResponse.json({ ok: true, activated: true, plan: payment.plan });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "pakasir" });
}
