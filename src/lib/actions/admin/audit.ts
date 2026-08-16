"use server";

import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { listAuditLogsSchema } from "@/lib/admin-schemas";

const PAGE_SIZE = 50;

export async function listAuditLogs(input: z.infer<typeof listAuditLogsSchema>) {
  const admin = await requireAdmin();
  await enforceServerActionRateLimit("admin:list-audit", admin.id, { limit: 120, windowSec: 60 });
  const parsed = listAuditLogsSchema.parse(input);

  const where = parsed.action ? eq(adminAuditLogs.action, parsed.action) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(adminAuditLogs)
    .where(where);

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      adminUserId: adminAuditLogs.adminUserId,
      adminName: users.name,
      adminEmail: users.email,
      targetUserId: adminAuditLogs.targetUserId,
      targetWorkspaceId: adminAuditLogs.targetWorkspaceId,
      metadata: adminAuditLogs.metadata,
      ipAddress: adminAuditLogs.ipAddress,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(users.id, adminAuditLogs.adminUserId))
    .where(where)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((parsed.page - 1) * PAGE_SIZE);

  return {
    logs: rows,
    total,
    page: parsed.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
