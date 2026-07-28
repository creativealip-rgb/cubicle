import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projectServices, timeEntries } from "@/db/schema";
import { calculateServiceProfitability } from "@/lib/service-profitability";

export async function getServiceProfitabilityReport(workspaceId: string) {
  const rows = await db
    .select({
      id: projectServices.id,
      name: projectServices.nameSnapshot,
      currency: projectServices.currencySnapshot,
      soldAmount: projectServices.amount,
      estimatedMinutes: projectServices.estimatedMinutes,
      costRate: projectServices.costRateSnapshot,
      actualMinutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)`,
    })
    .from(projectServices)
    .leftJoin(timeEntries, and(
      eq(timeEntries.workspaceId, projectServices.workspaceId),
      eq(timeEntries.projectServiceId, projectServices.id),
    ))
    .where(and(eq(projectServices.workspaceId, workspaceId), eq(projectServices.status, "active")))
    .groupBy(projectServices.id);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    currency: row.currency,
    ...calculateServiceProfitability({
      soldAmount: Number(row.soldAmount ?? 0),
      actualMinutes: Number(row.actualMinutes ?? 0),
      costRatePerHour: Number(row.costRate ?? 0),
      estimatedMinutes: row.estimatedMinutes,
    }),
  }));
}
