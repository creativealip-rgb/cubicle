import { and, eq, inArray, isNotNull, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices, timeEntries } from "@/db/schema";
import type { EligibleInvoiceTimeEntry } from "@/lib/invoice-source-ui";

export const activeInvoiceStatuses = ["draft", "sent", "viewed", "paid", "overdue"] as const;
export const fixedSourceModes = ["fixed_full", "fixed_dp", "fixed_milestone", "fixed_final"] as const;

export type InvoiceSourceProjectOption = {
  agreedAmount: number;
  priorActiveFixedBilledAmount: number;
  eligibleTimeEntries: EligibleInvoiceTimeEntry[];
};

export async function loadInvoiceSourceProjectOptions({ workspaceId, clientId, projectIds }: { workspaceId: string; clientId?: string; projectIds?: string[] }) {
  if (projectIds && projectIds.length === 0) return new Map<string, InvoiceSourceProjectOption>();
  const scope = [eq(timeEntries.workspaceId, workspaceId), isNotNull(timeEntries.projectId), eq(timeEntries.status, "approved"), eq(timeEntries.billable, true), sql`${timeEntries.durationMinutes} > 0`, sql`${timeEntries.hourlyRate} > 0`, sql`(${timeEntries.endTime} is not null or ${timeEntries.manualMinutes} is not null)`, notExists(db.select({ id: invoiceItems.id }).from(invoiceItems).where(and(eq(invoiceItems.sourceType, "time_entry"), eq(invoiceItems.sourceId, timeEntries.id))))];
  if (clientId) scope.push(eq(timeEntries.clientId, clientId));
  if (projectIds) scope.push(inArray(timeEntries.projectId, projectIds));
  const entries = await db.select({ id: timeEntries.id, projectId: timeEntries.projectId, workDate: timeEntries.workDate, description: timeEntries.description, durationMinutes: timeEntries.durationMinutes, hourlyRate: timeEntries.hourlyRate }).from(timeEntries).where(and(...scope));

  const fixedScope = [eq(invoices.workspaceId, workspaceId), inArray(invoices.status, [...activeInvoiceStatuses]), inArray(invoiceItems.sourceMode, [...fixedSourceModes]), eq(invoiceItems.sourceType, "project"), isNotNull(invoiceItems.sourceId)];
  if (clientId) fixedScope.push(eq(invoices.clientId, clientId));
  if (projectIds) fixedScope.push(inArray(invoiceItems.sourceId, projectIds));
  const totals = await db.select({ projectId: invoiceItems.sourceId, amount: sql<string>`coalesce(sum(${invoiceItems.originalAmount}), 0)` }).from(invoiceItems).innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId)).where(and(...fixedScope)).groupBy(invoiceItems.sourceId);

  const result = new Map<string, InvoiceSourceProjectOption>();
  for (const row of entries) {
    if (!row.projectId || !row.workDate || row.hourlyRate == null) continue;
    const option = result.get(row.projectId) ?? { agreedAmount: 0, priorActiveFixedBilledAmount: 0, eligibleTimeEntries: [] };
    option.eligibleTimeEntries.push({ id: row.id, workDate: row.workDate, description: row.description, durationMinutes: Number(row.durationMinutes), hourlyRate: Number(row.hourlyRate) });
    result.set(row.projectId, option);
  }
  for (const row of totals) if (row.projectId) {
    const option = result.get(row.projectId) ?? { agreedAmount: 0, priorActiveFixedBilledAmount: 0, eligibleTimeEntries: [] };
    option.priorActiveFixedBilledAmount = Number(row.amount);
    result.set(row.projectId, option);
  }
  return result;
}
