"use server";

import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pakasirPayments, workspaces } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { listPaymentsSchema } from "@/lib/admin-schemas";

const PAGE_SIZE = 25;

/**
 * Payment log — READ-ONLY (locked decision: no mark-paid; tier changes go
 * through changeUserPlan which never touches pakasir_payments).
 */
export async function listPayments(input: z.infer<typeof listPaymentsSchema>) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:list-payments", admin.id, { limit: 120, windowSec: 60 });
  const parsed = listPaymentsSchema.parse(input);

  const where = parsed.status ? eq(pakasirPayments.status, parsed.status) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(pakasirPayments)
    .where(where);

  const rows = await db
    .select({
      id: pakasirPayments.id,
      orderId: pakasirPayments.orderId,
      workspaceId: pakasirPayments.workspaceId,
      workspaceName: workspaces.name,
      plan: pakasirPayments.plan,
      billingPeriod: pakasirPayments.billingPeriod,
      paymentType: pakasirPayments.paymentType,
      amount: pakasirPayments.amount,
      status: pakasirPayments.status,
      paymentMethod: pakasirPayments.paymentMethod,
      paidAt: pakasirPayments.paidAt,
      createdAt: pakasirPayments.createdAt,
    })
    .from(pakasirPayments)
    .leftJoin(workspaces, eq(workspaces.id, pakasirPayments.workspaceId))
    .where(where)
    .orderBy(desc(pakasirPayments.createdAt))
    .limit(PAGE_SIZE)
    .offset((parsed.page - 1) * PAGE_SIZE);

  return {
    payments: rows,
    total,
    page: parsed.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPaymentDetail(paymentId: string) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:payment-detail", admin.id, { limit: 120, windowSec: 60 });

  const [payment] = await db
    .select()
    .from(pakasirPayments)
    .where(eq(pakasirPayments.id, paymentId))
    .limit(1);
  if (!payment) return null;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, payment.workspaceId))
    .limit(1);

  return { payment, workspace: workspace ?? null };
}
