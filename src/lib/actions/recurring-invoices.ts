"use server";

import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  clients,
  invoiceItems,
  invoices,
  projects,
  recurringInvoiceGenerations,
  recurringInvoiceRules,
  workspaces,
  type RecurringInvoiceLine,
} from "@/db/schema";
import { assertWorkspaceWritable, requireUser } from "@/lib/access";
import { auth } from "@/lib/auth";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { nextRecurringInvoiceDate, renderRecurringInvoiceNumber, validateRecurringInvoiceNumberPattern } from "@/lib/recurring-invoice-number";

const lineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const ruleSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  nextRunDate: z.string().date().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  terms: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  lines: z.array(lineSchema).min(1),
  numberPattern: z.string(),
});

const updateRuleSchema = ruleSchema.partial().extend({ isActive: z.boolean().optional() });

async function writableContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  return { userId: user.id, workspaceId };
}

async function assertRuleRelations(workspaceId: string, clientId: string, projectId?: string | null) {
  const [client] = await db.select({ id: clients.id }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId))).limit(1);
  if (!client) throw new Error("Klien tidak ditemukan / Client not found");
  if (projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId), eq(projects.workspaceId, workspaceId))).limit(1);
    if (!project) throw new Error("Proyek tidak ditemukan untuk klien ini / Project not found for this client");
  }
}

export async function listRecurringInvoiceRules() {
  const { workspaceId } = await writableContext();
  return db.select().from(recurringInvoiceRules)
    .where(eq(recurringInvoiceRules.workspaceId, workspaceId))
    .orderBy(asc(recurringInvoiceRules.nextRunDate));
}

export async function createRecurringInvoiceRule(input: z.input<typeof ruleSchema>) {
  const { userId, workspaceId } = await writableContext();
  const parsed = ruleSchema.parse(input);
  await assertRuleRelations(workspaceId, parsed.clientId, parsed.projectId);
  const numberPattern = validateRecurringInvoiceNumberPattern(parsed.numberPattern);
  const nextRunDate = parsed.nextRunDate ?? parsed.startDate;
  if (parsed.endDate && parsed.endDate < nextRunDate) throw new Error("Tanggal selesai harus setelah jadwal berikutnya / End date must be after next run date");
  const [rule] = await db.insert(recurringInvoiceRules).values({
    workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId ?? null,
    frequency: parsed.frequency,
    startDate: parsed.startDate,
    endDate: parsed.endDate ?? null,
    nextRunDate,
    currency: parsed.currency,
    terms: parsed.terms ?? null,
    notes: parsed.notes ?? null,
    lines: parsed.lines,
    numberPattern,
    createdBy: userId,
  }).returning();
  return rule;
}

export async function updateRecurringInvoiceRule(ruleId: string, input: z.input<typeof updateRuleSchema>) {
  const { workspaceId } = await writableContext();
  const parsed = updateRuleSchema.parse(input);
  const [current] = await db.select().from(recurringInvoiceRules)
    .where(and(eq(recurringInvoiceRules.id, ruleId), eq(recurringInvoiceRules.workspaceId, workspaceId))).limit(1);
  if (!current) throw new Error("Aturan tidak ditemukan / Rule not found");
  const clientId = parsed.clientId ?? current.clientId;
  const projectId = parsed.projectId === undefined ? current.projectId : parsed.projectId;
  await assertRuleRelations(workspaceId, clientId, projectId);
  const values = {
    ...parsed,
    projectId: parsed.projectId === undefined ? undefined : parsed.projectId ?? null,
    numberPattern: parsed.numberPattern === undefined ? undefined : validateRecurringInvoiceNumberPattern(parsed.numberPattern),
    terms: parsed.terms === undefined ? undefined : parsed.terms ?? null,
    notes: parsed.notes === undefined ? undefined : parsed.notes ?? null,
    updatedAt: new Date(),
  };
  const [rule] = await db.update(recurringInvoiceRules).set(values)
    .where(and(eq(recurringInvoiceRules.id, ruleId), eq(recurringInvoiceRules.workspaceId, workspaceId))).returning();
  return rule;
}

export async function deleteRecurringInvoiceRule(ruleId: string) {
  const { workspaceId } = await writableContext();
  const [rule] = await db.delete(recurringInvoiceRules)
    .where(and(eq(recurringInvoiceRules.id, ruleId), eq(recurringInvoiceRules.workspaceId, workspaceId))).returning({ id: recurringInvoiceRules.id });
  if (!rule) throw new Error("Aturan tidak ditemukan / Rule not found");
  return rule;
}

function dateInTimezone(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function generateRule(ruleId: string, now: Date, workspaceId?: string) {
  return db.transaction(async (tx) => {
    const [rule] = await tx.select().from(recurringInvoiceRules).where(eq(recurringInvoiceRules.id, ruleId)).for("update").limit(1);
    if (!rule || !rule.isActive) return null;
    if (workspaceId && rule.workspaceId !== workspaceId) throw new Error("Aturan tidak ditemukan / Rule not found");
    const [workspace] = await tx.select({ timezone: workspaces.timezone }).from(workspaces).where(eq(workspaces.id, rule.workspaceId)).limit(1);
    const today = dateInTimezone(now, workspace?.timezone ?? "UTC");
    if (rule.nextRunDate > today || (rule.endDate && rule.nextRunDate > rule.endDate)) return null;
    const [existing] = await tx.select({ invoiceId: recurringInvoiceGenerations.invoiceId }).from(recurringInvoiceGenerations)
      .where(and(eq(recurringInvoiceGenerations.ruleId, rule.id), eq(recurringInvoiceGenerations.occurrenceDate, rule.nextRunDate))).limit(1);
    if (existing) return existing.invoiceId;
    const [client] = await tx.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, rule.clientId), eq(clients.workspaceId, rule.workspaceId))).limit(1);
    if (!client) throw new Error("Recurring invoice client is no longer active");
    if (rule.projectId) {
      const [project] = await tx.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, rule.projectId), eq(projects.workspaceId, rule.workspaceId), eq(projects.clientId, rule.clientId))).limit(1);
      if (!project) throw new Error("Recurring invoice project is no longer active");
    }
    const sequence = rule.lastSequence + 1;
    const invoiceNumber = renderRecurringInvoiceNumber(rule.numberPattern, Number(rule.nextRunDate.slice(0, 4)), sequence);
    const lines = rule.lines as RecurringInvoiceLine[];
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const [invoice] = await tx.insert(invoices).values({
      workspaceId: rule.workspaceId,
      clientId: rule.clientId,
      projectId: rule.projectId,
      invoiceNumber,
      issueDate: rule.nextRunDate,
      currency: rule.currency,
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2),
      status: "draft",
      notes: rule.notes,
      terms: rule.terms,
    }).returning({ id: invoices.id });
    await tx.insert(invoiceItems).values(lines.map((line) => ({
      invoiceId: invoice.id,
      description: line.description,
      quantity: line.quantity.toFixed(2),
      unitPrice: line.unitPrice.toFixed(2),
      amount: (line.quantity * line.unitPrice).toFixed(2),
      sourceType: "manual" as const,
    })));
    await tx.insert(recurringInvoiceGenerations).values({ workspaceId: rule.workspaceId, ruleId: rule.id, occurrenceDate: rule.nextRunDate, invoiceId: invoice.id });
    const nextRunDate = nextRecurringInvoiceDate(rule.nextRunDate, rule.frequency);
    await tx.update(recurringInvoiceRules).set({
      lastSequence: sequence,
      nextRunDate,
      isActive: rule.endDate ? nextRunDate <= rule.endDate : true,
      updatedAt: new Date(),
    }).where(eq(recurringInvoiceRules.id, rule.id));
    return invoice.id;
  });
}

export async function generateDueRecurringInvoices(now = new Date()) {
  const due = await db.select({ id: recurringInvoiceRules.id }).from(recurringInvoiceRules)
    .where(and(eq(recurringInvoiceRules.isActive, true), or(isNull(recurringInvoiceRules.endDate), lte(recurringInvoiceRules.nextRunDate, recurringInvoiceRules.endDate))))
    .orderBy(asc(recurringInvoiceRules.nextRunDate));
  const generated: string[] = [];
  for (const rule of due) {
    const invoiceId = await generateRule(rule.id, now);
    if (invoiceId) generated.push(invoiceId);
  }
  return { processed: due.length, generated: generated.length, invoiceIds: generated };
}

export async function generateRecurringInvoiceNow(ruleId: string) {
  const { workspaceId } = await writableContext();
  return generateRule(ruleId, new Date(), workspaceId);
}
