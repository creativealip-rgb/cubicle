"use server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLogs, marketingSpend } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { revalidatePath } from "next/cache";

const spendInput = z.object({ spendDate: z.string().date(), source: z.string().trim().min(1).max(80), amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), campaign: z.string().trim().max(120).optional(), currency: z.string().trim().length(3).default("IDR"), notes: z.string().trim().max(500).optional() });
export async function listMarketingSpend() { await requireAdmin(); return db.select().from(marketingSpend).orderBy(desc(marketingSpend.spendDate), desc(marketingSpend.createdAt)).limit(200); }
export async function recordMarketingSpend(raw: z.input<typeof spendInput>) { const admin = await requireAdmin(); await enforceServerActionRateLimit("admin:marketing-spend", admin.id, { limit: 30, windowSec: 60 }); const input = spendInput.parse(raw); const result = await db.insert(marketingSpend).values({ ...input, createdBy: admin.id }).returning(); await db.insert(adminAuditLogs).values({ adminUserId: admin.id, action: "marketing_spend.create", metadata: { source: input.source, amount: input.amount } }); revalidatePath("/dashboard"); return result[0]; }
export async function deleteMarketingSpend(id: string) { const admin = await requireAdmin(); await enforceServerActionRateLimit("admin:marketing-spend", admin.id, { limit: 30, windowSec: 60 }); const [row] = await db.delete(marketingSpend).where(eq(marketingSpend.id, id)).returning(); if (!row) throw new Error("Spend record not found"); await db.insert(adminAuditLogs).values({ adminUserId: admin.id, action: "marketing_spend.delete", metadata: { id } }); revalidatePath("/dashboard"); return row; }
// audit trail
void and;
void eq;
void desc;
