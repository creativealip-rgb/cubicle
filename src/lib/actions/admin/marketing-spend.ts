"use server";
import { db } from "@/db";
import { marketingSpend } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { adminAuditLogs } from "@/db/schema";
export async function recordMarketingSpend(input: { spendDate: string; source: string; amount: string; campaign?: string; currency?: string; notes?: string }) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:marketing-spend", admin.id, { limit: 30, windowSec: 60 });
  const result = await db.insert(marketingSpend).values({ ...input, amount: input.amount, currency: input.currency ?? "IDR", createdBy: admin.id }).returning();
  await db.insert(adminAuditLogs).values({ adminUserId: admin.id, action: "marketing_spend.create", metadata: { source: input.source, amount: input.amount } });
  return result[0];
}
// audit marketingSpend
// requireAdmin
// enforceServerActionRateLimit
