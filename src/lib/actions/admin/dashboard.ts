"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";

/**
 * KPI snapshot for the admin dashboard (P1 item 14):
 * total users, new users 7/30d, MRR (from completed plan payments), free→paid
 * conversion, total workspaces, completed payments count.
 */
export async function getAdminKpis() {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:kpis", admin.id, { limit: 120, windowSec: 60 });

  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '30 days') AS new_users_30d,
      (SELECT count(*)::int FROM workspaces) AS total_workspaces,
      (SELECT count(*)::int FROM pakasir_payments WHERE status = 'completed') AS completed_payments,
      (
        SELECT COALESCE(round(sum(amount)::numeric, 0), 0)::text
        FROM pakasir_payments
        WHERE status = 'completed' AND billing_period = 'monthly'
      ) AS mrr_raw,
      (
        SELECT count(*)::int FROM users
        WHERE plan IN ('solo', 'team')
      ) AS paid_users
    `);

  const row = result.rows[0] as Record<string, number | string> | undefined;

  // MRR: monthly plan payments are the recurring baseline. Yearly payments
  // are annualized (÷12) so a mixed book yields an apples-to-apples monthly
  // figure.
  const mrrResult = await db.execute(sql`
    SELECT COALESCE(
      round(
        sum(CASE
          WHEN billing_period = 'monthly' THEN amount
          WHEN billing_period = 'yearly' THEN amount / 12
          ELSE 0
        END)::numeric, 0
      ), 0
    )::text AS mrr
    FROM pakasir_payments
    WHERE status = 'completed' AND payment_type = 'plan'
  `);

  const mrrRow = mrrResult.rows[0] as { mrr: string } | undefined;

  const totalUsers = Number(row?.total_users ?? 0);
  const paidUsers = Number(row?.paid_users ?? 0);

  return {
    totalUsers,
    newUsers7d: Number(row?.new_users_7d ?? 0),
    newUsers30d: Number(row?.new_users_30d ?? 0),
    totalWorkspaces: Number(row?.total_workspaces ?? 0),
    completedPayments: Number(row?.completed_payments ?? 0),
    mrr: mrrRow?.mrr ?? "0",
    freeToPaidConversion: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 1000) / 10 : 0,
    paidUsers,
  };
}
