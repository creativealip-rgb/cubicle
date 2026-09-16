import { sql } from "drizzle-orm";
import { db } from "@/db";
import { GROWTH_RANGES, getRangeWindow } from "@/lib/admin-growth-metrics";

async function main() {
  for (const range of GROWTH_RANGES) {
    const { days } = getRangeWindow(range);
    const result = await db.execute(sql`SELECT ${range} AS range, ${days} AS days, (SELECT count(*) FROM users WHERE created_at >= now() - ${range === "12m" ? sql`make_interval(months => 12)` : sql`make_interval(days => ${days})`})::int AS signups`);
    const row = result.rows[0] as Record<string, unknown>;
    if (row.range !== range || Number(row.signups) < 0) throw new Error(`${range}: invalid signup result`);
    console.log(`${range}: PASS signups=${String(row.signups)} days=${String(row.days)}`);
  }
  const checks = await db.execute(sql`SELECT
    (SELECT count(*) FROM pakasir_payments WHERE status = 'completed' AND payment_type = 'plan') AS completed_plan_rows,
    (SELECT count(*) FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.role = 'owner' AND u.plan <> 'free' AND (u.plan_expires_at IS NULL OR u.plan_expires_at > now())) AS active_owner_plans,
    (SELECT count(*) FROM workspace_members) AS memberships`);
  console.log(`SQL checks: PASS ${JSON.stringify(checks.rows[0])}`);
  console.log("Unavailable: visitors, referrals, CAC, historical paid-period comparison require missing instrumentation/history.");
}

main().finally(() => db.$client.end());
