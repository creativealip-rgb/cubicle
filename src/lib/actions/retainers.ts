"use server";

import { db } from "@/db";
import { invoiceItems, invoices, projects, retainerPeriods, timeEntries, workspaceInvoiceCounters, workspaces } from "@/db/schema";
import { assertWorkspaceWritable } from "@/lib/access";
import { auth } from "@/lib/auth";
import { writeActivityLog } from "@/lib/actions/activity";
import { buildRetainerInvoiceLines, calculateRetainerUsage, getRetainerPeriodRange } from "@/lib/retainer-period";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { normalizeInvoiceNumber } from "@/lib/invoice-number";

const periodInputSchema = z.object({ projectId: z.string().uuid(), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const periodIdSchema = z.string().uuid();
const invoiceInputSchema = z.object({ retainerPeriodId: z.string().uuid(), issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), invoiceNumber: z.string().optional() });
const retainerInvoiceIdSchema = z.string().uuid();

async function requireWritableWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) throw new Error("Unauthorized");
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  return { user, workspaceId };
}

async function nextInvoiceNumber(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], workspaceId: string) {
  const [counter] = await tx.select().from(workspaceInvoiceCounters).where(eq(workspaceInvoiceCounters.workspaceId, workspaceId)).for("update").limit(1);
  const [maxRow] = await tx.select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber} FROM 'INV-([0-9]+)$') AS INTEGER)), 0)` }).from(invoices).where(eq(invoices.workspaceId, workspaceId));
  const nextNum = Math.max(counter?.nextNumber ?? 1, Number(maxRow?.maxNum ?? 0) + 1);
  if (!counter) await tx.insert(workspaceInvoiceCounters).values({ workspaceId, nextNumber: nextNum + 1 });
  else await tx.update(workspaceInvoiceCounters).set({ nextNumber: nextNum + 1, updatedAt: new Date() }).where(eq(workspaceInvoiceCounters.workspaceId, workspaceId));
  return `INV-${String(nextNum).padStart(4, "0")}`;
}

export async function createOrGetRetainerPeriod(input: z.infer<typeof periodInputSchema>) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsed = periodInputSchema.parse(input);

  const [project] = await db.select({ id: projects.id, clientId: projects.clientId, billingModel: projects.billingModel, billingType: projects.billingType, currency: projects.currency, retainerFee: projects.retainerFee, retainerIncludedMinutes: projects.retainerIncludedMinutes, retainerResetDay: projects.retainerResetDay, retainerOveragePolicy: projects.retainerOveragePolicy, retainerOverageRate: projects.retainerOverageRate, timezone: workspaces.timezone }).from(projects).innerJoin(workspaces, eq(workspaces.id, projects.workspaceId)).where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project) throw new Error("Project Retainer tidak ditemukan");
  if (project.billingModel !== "retainer") throw new Error("Project bukan Retainer");
  if (project.retainerFee == null || project.retainerIncludedMinutes == null || project.retainerResetDay == null || !project.retainerOveragePolicy) throw new Error("Konfigurasi Retainer belum lengkap");

  const retainerIncludedMinutes = project.retainerIncludedMinutes;
  const retainerOveragePolicy = project.retainerOveragePolicy;

  const range = getRetainerPeriodRange(parsed.workDate, project.retainerResetDay);
  const period = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(retainerPeriods).where(and(eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.projectId, parsed.projectId), eq(retainerPeriods.periodStart, range.start), eq(retainerPeriods.periodEnd, range.end))).for("update").limit(1);
    if (existing) return existing;
    const newPeriod: typeof retainerPeriods.$inferInsert = {
      workspaceId,
      projectId: parsed.projectId,
      periodStart: range.start,
      periodEnd: range.end,
      timezoneSnapshot: project.timezone,
      feeSnapshot: String(project.retainerFee),
      currencySnapshot: project.currency,
      includedMinutesSnapshot: retainerIncludedMinutes,
      overagePolicySnapshot: retainerOveragePolicy,
      overageRateSnapshot: project.retainerOverageRate == null ? null : String(project.retainerOverageRate),
    };
    const [created] = await tx.insert(retainerPeriods).values(newPeriod).returning();
    return created;
  });

  await writeActivityLog(workspaceId, user.id, "created_or_loaded_retainer_period", "retainer_period", period.id);
  return period;
}

export async function lockRetainerPeriod(retainerPeriodId: string) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsedId = periodIdSchema.parse(retainerPeriodId);

  const period = await db.transaction(async (tx) => {
    const [period] = await tx.select().from(retainerPeriods).where(and(eq(retainerPeriods.id, parsedId), eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.status, "open"))).for("update").limit(1);
    if (!period) throw new Error("Periode Retainer open tidak ditemukan");

    const entries = await tx.select({ id: timeEntries.id, durationMinutes: timeEntries.durationMinutes }).from(timeEntries).where(and(
      eq(timeEntries.workspaceId, workspaceId),
      eq(timeEntries.projectId, period.projectId),
      eq(timeEntries.retainerPeriodId, period.id),
      eq(timeEntries.status, "approved"),
      eq(timeEntries.billable, true),
      isNotNull(timeEntries.endTime),
      sql`${timeEntries.durationMinutes} > 0`,
    )).for("update");
    const usage = calculateRetainerUsage({ approvedMinutes: entries.map((entry) => Number(entry.durationMinutes)), includedMinutes: period.includedMinutesSnapshot });
    const [updated] = await tx.update(retainerPeriods).set({ approvedMinutes: usage.approvedMinutes, overageMinutes: usage.overageMinutes, status: "locked", lockedAt: new Date(), updatedAt: new Date() }).where(and(eq(retainerPeriods.id, period.id), eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.status, "open"))).returning();
    return updated;
  });

  await writeActivityLog(workspaceId, user.id, "locked_retainer_period", "retainer_period", period.id);
  return period;
}

export async function generateRetainerInvoice(input: z.infer<typeof invoiceInputSchema>) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsed = invoiceInputSchema.parse(input);

  const invoice = await db.transaction(async (tx) => {
    const [period] = await tx.select().from(retainerPeriods).where(and(eq(retainerPeriods.id, parsed.retainerPeriodId), eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.status, "locked"))).for("update").limit(1);
    if (!period) throw new Error("Periode Retainer locked tidak ditemukan");
    const [existing] = await tx.select().from(invoices).where(and(eq(invoices.retainerPeriodId, period.id), eq(invoices.workspaceId, workspaceId), ne(invoices.status, "cancelled"))).for("update").limit(1);
    if (existing) return existing;
    const [project] = await tx.select({ clientId: projects.clientId }).from(projects).where(and(eq(projects.id, period.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
    if (!project) throw new Error("Project Retainer tidak ditemukan");

    const invoiceNumber = normalizeInvoiceNumber(parsed.invoiceNumber) ?? await nextInvoiceNumber(tx, workspaceId);
    const lines = buildRetainerInvoiceLines({ fee: Number(period.feeSnapshot), currency: period.currencySnapshot, periodStart: period.periodStart, periodEnd: period.periodEnd, overagePolicy: period.overagePolicySnapshot, overageMinutes: period.overageMinutes, overageRate: period.overageRateSnapshot == null ? null : Number(period.overageRateSnapshot) });
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const [inv] = await tx.insert(invoices).values({
      workspaceId,
      clientId: project.clientId,
      projectId: period.projectId,
      billingSource: "retainer",
      billingPeriodStart: period.periodStart,
      billingPeriodEnd: period.periodEnd,
      retainerPeriodId: period.id,
      invoiceNumber,
      issueDate: parsed.issueDate,
      dueDate: parsed.dueDate ?? null,
      currency: period.currencySnapshot,
      subtotal: String(subtotal),
      discount: "0",
      tax: "0",
      total: String(subtotal),
      status: "draft",
    }).returning();
    await tx.insert(invoiceItems).values(lines.map((line, index) => ({
      invoiceId: inv.id,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      amount: String(line.amount),
      sourceType: "manual" as const,
      sourceMode: index === 0 ? "retainer_base" as const : "retainer_overage" as const,
      sourceMetadata: { periodStart: period.periodStart, periodEnd: period.periodEnd },
      originalCurrency: period.currencySnapshot,
      originalAmount: String(line.amount),
      conversionRate: "1",
    })));
    await tx.update(retainerPeriods).set({ status: "invoiced", invoicedAt: new Date(), updatedAt: new Date() }).where(and(eq(retainerPeriods.id, period.id), eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.status, "locked")));
    return inv;
  });

  await writeActivityLog(workspaceId, user.id, "generated_retainer_invoice", "invoice", invoice.id);
  return invoice;
}

export async function cancelRetainerInvoice(invoiceId: string) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsedId = retainerInvoiceIdSchema.parse(invoiceId);

  await db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, parsedId), eq(invoices.workspaceId, workspaceId), eq(invoices.billingSource, "retainer"))).for("update").limit(1);
    if (!invoice?.retainerPeriodId) throw new Error("Invoice Retainer tidak ditemukan");
    if (!["draft", "sent"].includes(invoice.status)) throw new Error("Hanya draft/sent Retainer invoice yang bisa dibatalkan");
    await tx.update(invoices).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(invoices.id, invoice.id), eq(invoices.workspaceId, workspaceId)));
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    await tx.update(retainerPeriods).set({ status: "locked", invoicedAt: null, invoiceGeneration: sql`${retainerPeriods.invoiceGeneration} + 1`, updatedAt: new Date() }).where(and(eq(retainerPeriods.id, invoice.retainerPeriodId), eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.status, "invoiced")));
  });

  await writeActivityLog(workspaceId, user.id, "cancelled_retainer_invoice", "invoice", parsedId);
  return { success: true };
}

export async function linkRetainerTimeEntries(input: z.infer<typeof periodInputSchema>) {
  const { workspaceId } = await requireWritableWorkspace();
  const parsed = periodInputSchema.parse(input);
  const period = await createOrGetRetainerPeriod(parsed);
  const ids = await db.select({ id: timeEntries.id }).from(timeEntries).where(and(eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.projectId, parsed.projectId), sql`coalesce(${timeEntries.workDate}, ${timeEntries.startTime}::date) >= ${period.periodStart}`, sql`coalesce(${timeEntries.workDate}, ${timeEntries.startTime}::date) < ${period.periodEnd}`));
  if (!ids.length) return { linked: 0 };
  await db.update(timeEntries).set({ retainerPeriodId: period.id, updatedAt: new Date() }).where(and(eq(timeEntries.workspaceId, workspaceId), inArray(timeEntries.id, ids.map((row) => row.id))));
  return { linked: ids.length };
}
