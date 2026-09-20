import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlan, getPlanLimits } from "@/lib/plan";
import { getUserPurchasedAiQuota } from "@/lib/ai-addons";
import { db } from "@/db";
import { aiUsageDaily } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  const extraQuota = await getUserPurchasedAiQuota(userId);

  const baseQuota = limits.aiRequestsPerMonth;
  const totalLimit = baseQuota === 0 ? 0 : baseQuota + extraQuota;

  const [usageRow] = await db
    .select({ count: aiUsageDaily.count })
    .from(aiUsageDaily)
    .where(
      and(
        eq(aiUsageDaily.userId, userId),
        eq(aiUsageDaily.usageDate, sql`date_trunc('month', current_date)::date`),
      ),
    )
    .limit(1);

  const used = usageRow?.count ?? 0;

  return NextResponse.json({
    ok: true,
    plan,
    used,
    limit: totalLimit,
    baseLimit: baseQuota,
    extraQuota,
  });
}
