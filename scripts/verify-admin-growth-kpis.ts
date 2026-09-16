import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { GROWTH_RANGES, getRangeWindow } from "@/lib/admin-growth-metrics";

for (const range of GROWTH_RANGES) {
  const { days } = getRangeWindow(range);
  const result = await db.execute(sql`SELECT ${range} AS range, ${days} AS days, (SELECT count(*) FROM users WHERE created_at >= now() - make_interval(days => ${days}))::int AS signups`);
  const row = result.rows[0] as Record<string, unknown>;
  console.log(`${range}: PASS signups=${String(row.signups)} days=${String(row.days)}`);
}
console.log("Unavailable: visitors, referrals, CAC require Phase 2 event/spend data.");
