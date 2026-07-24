"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  payments,
  workspaceInvoiceCounters,
  timeEntries,
  workspaces,
  clients,
  projects,
  packages,
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireUser, assertWorkspaceWritable, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyInvoicePaymentReminder, notifyInvoiceSent } from "@/lib/notifications";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { formatMoney } from "@/lib/utils";
import { assertPaymentWithinRemaining } from "@/lib/invoice-payment-rules";
import {
  assertInvoiceFinancialsMutable,
  calculateInvoiceTotals,
} from "@/lib/invoice-finance-rules";
import { validateInvoiceMessage } from "@/lib/invoice-message";
import { buildInvoiceReportUrl, normalizeInvoiceReportRange, signInvoiceReportRange } from "@/lib/invoice-report-options";
import { resolveWorkspaceReplyTo } from "@/lib/workspace-reply-to";
import { buildRateMap } from "@/lib/currency-base";
import { convertCurrency, resolveProjectAmount } from "@/lib/invoice-project-items";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

// ─── Schemas ───

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    sourceId: z.string().uuid().optional(),
  })).optional(),
});

const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled", "archived"]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
});

const addItemSchema = z.object({
  invoiceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
});

const updateItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().min(0).optional(),
});

const importTimeSchema = z.object({
  invoiceId: z.string().uuid(),
  timeEntryIds: z.array(z.string().uuid()),
});

const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paidAt: z.string().min(1),
  method: z.string().optional(),
  notes: z.string().optional(),
});

async function assertInvoiceInWorkspace(invoiceId: string, workspaceId: string) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!inv) throw new Error("Invoice not found");
  return inv;
}

// ─── CRUD ───

export async function createInvoice(input: z.infer<typeof createInvoiceSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  // Check plan limits (plan is per-user, not per-workspace)
  const { getUserPlan, checkEntityLimit } = await import("@/lib/plan");
  const plan = await getUserPlan(user.id);
  const invLimit = await checkEntityLimit(workspaceId, "invoices", plan);
  if (!invLimit.allowed) {
    throw new Error(invLimit.reason!);
  }

  const parsed = createInvoiceSchema.parse(input);

  const [validClient] = await db.select({ id: clients.id }).from(clients).where(and(
    eq(clients.id, parsed.clientId),
    eq(clients.workspaceId, workspaceId),
  )).limit(1);
  if (!validClient) throw new Error("Klien tidak ditemukan");

  if (parsed.projectId) {
    const [validProject] = await db.select({ id: projects.id }).from(projects).where(and(
      eq(projects.id, parsed.projectId),
      eq(projects.workspaceId, workspaceId),
      eq(projects.clientId, parsed.clientId),
    )).limit(1);
    if (!validProject) throw new Error("Proyek tidak sesuai dengan klien");
  }

  const [ws] = await db
    .select({ defaultCurrency: workspaces.defaultCurrency, defaultTaxRate: workspaces.defaultTaxRate, defaultInvoiceTerms: workspaces.defaultInvoiceTerms })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const projectIds = Array.from(new Set(parsed.projectIds ?? (parsed.projectId ? [parsed.projectId] : [])));
  if ((parsed.projectIds?.length ?? 0) !== projectIds.length) throw new Error("Proyek duplikat tidak diizinkan");
  const rateRows = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const rateMap = buildRateMap(rateRows);
  const projectItemValues: Array<{ description: string; quantity: number; unitPrice: number; sourceId: string; originalCurrency: string; originalAmount: number; conversionRate: number }> = [];
  for (const projectId of projectIds) {
    const [project] = await db.select({ id: projects.id, name: projects.name, billingType: projects.billingType, budget: projects.budget, rate: projects.rate, currency: projects.currency, packagePrice: packages.price, packageCustomPrice: packages.customPrice }).from(projects).leftJoin(packages, eq(projects.selectedPackageId, packages.id)).where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId), eq(projects.clientId, parsed.clientId))).limit(1);
    if (!project) throw new Error("Ada proyek yang tidak sesuai dengan klien");
    const originalAmount = resolveProjectAmount({ billingType: project.billingType, budget: project.budget ? Number(project.budget) : null, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null });
    if (project.billingType === "hours") continue;
    const converted = convertCurrency(originalAmount, project.currency, parsed.currency || ws?.defaultCurrency || "IDR", ws?.defaultCurrency || "IDR", rateMap);
    if (!converted) throw new Error(`Kurs ${project.currency} ke ${parsed.currency} belum tersedia`);
    projectItemValues.push({ description: project.name, quantity: 1, unitPrice: converted.amount, sourceId: project.id, originalCurrency: project.currency, originalAmount, conversionRate: converted.rate });
  }

  const invoice = await db.transaction(async (tx) => {
    // Generate invoice number inside transaction.
    // Counter is authoritative, but always bump above MAX(existing INV-####)
    // so seed data / manual inserts cannot collide with the unique constraint.
    const [counter] = await tx
      .select()
      .from(workspaceInvoiceCounters)
      .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId))
      .for("update")
      .limit(1);

    const [maxRow] = await tx
      .select({
        maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber} FROM 'INV-([0-9]+)$') AS INTEGER)), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId));

    const maxExisting = Number(maxRow?.maxNum ?? 0);
    const counterNext = counter?.nextNumber ?? 1;
    const nextNum = Math.max(counterNext, maxExisting + 1);
    const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;

    if (!counter) {
      await tx.insert(workspaceInvoiceCounters).values({
        workspaceId,
        nextNumber: nextNum + 1,
      });
    } else {
      await tx
        .update(workspaceInvoiceCounters)
        .set({ nextNumber: nextNum + 1, updatedAt: new Date() })
        .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId));
    }

    try {
      const [inv] = await tx
        .insert(invoices)
        .values({
          workspaceId,
          clientId: parsed.clientId,
          projectId: parsed.projectId || null,
          invoiceNumber,
          issueDate: parsed.issueDate,
          dueDate: parsed.dueDate || null,
          currency: parsed.currency || ws?.defaultCurrency || "USD",
          subtotal: "0",
          discount: "0",
          tax: "0",
          total: "0",
          status: "draft",
          notes: parsed.notes || null,
          terms: parsed.terms || ws?.defaultInvoiceTerms || null,
        })
        .returning();

      if ((parsed.items?.length || projectItemValues.length) && inv) {
        const sourceIds = parsed.items?.flatMap((item) => item.sourceId ? [item.sourceId] : []) ?? [];
        if (sourceIds.length) {
          const eligible = await tx.select({ id: timeEntries.id }).from(timeEntries).where(and(
            inArray(timeEntries.id, sourceIds), eq(timeEntries.workspaceId, workspaceId),
            eq(timeEntries.clientId, parsed.clientId), eq(timeEntries.billable, true),
            sql`${timeEntries.status} <> 'invoiced'`,
            projectIds.length ? inArray(timeEntries.projectId, projectIds) : sql`true`,
          ));
          if (eligible.length !== new Set(sourceIds).size) throw new Error("Ada timesheet yang tidak valid atau sudah ditagihkan");
        }
        const values = [
          ...projectItemValues.map((item) => ({ invoiceId: inv.id, description: item.description, quantity: "1", unitPrice: String(item.unitPrice), amount: String(item.unitPrice), sourceType: "project" as const, sourceId: item.sourceId, originalCurrency: item.originalCurrency, originalAmount: String(item.originalAmount), conversionRate: String(item.conversionRate) })),
          ...(parsed.items ?? []).map((item) => ({
          invoiceId: inv.id,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          amount: String(item.quantity * item.unitPrice),
          sourceType: item.sourceId ? "time_entry" as const : "manual" as const,
          sourceId: item.sourceId ?? null,
          originalCurrency: null,
          originalAmount: null,
          conversionRate: null,
        })),
        ];
        await tx.insert(invoiceItems).values(values);
        if (sourceIds.length) await tx.update(timeEntries).set({ status: "invoiced", updatedAt: new Date() }).where(inArray(timeEntries.id, sourceIds));
        const subtotal = values.reduce((sum, item) => sum + Number(item.amount), 0);
        const taxRate = Number(ws?.defaultTaxRate ?? 0) || 0;
        const tax = (subtotal * taxRate) / 100;
        const [refreshed] = await tx.update(invoices).set({
          subtotal: String(subtotal),
          tax: String(tax),
          total: String(subtotal + tax),
          updatedAt: new Date(),
        }).where(eq(invoices.id, inv.id)).returning();
        return refreshed ?? inv;
      }

      // Auto line item: project name + nominal dari project yang dipilih.
      if (parsed.projectId && inv) {
        const [proj] = await tx
          .select({
            id: projects.id,
            name: projects.name,
            clientId: projects.clientId,
            workspaceId: projects.workspaceId,
            billingType: projects.billingType,
            budget: projects.budget,
            rate: projects.rate,
            currency: projects.currency,
            selectedPackageId: projects.selectedPackageId,
          })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsed.projectId),
              eq(projects.workspaceId, workspaceId),
              eq(projects.clientId, parsed.clientId),
            ),
          )
          .limit(1);

        if (proj) {
          let unitPrice = 0;
          if (proj.billingType === "project") {
            unitPrice = Number(proj.budget ?? 0) || 0;
          } else if (proj.billingType === "package" && proj.selectedPackageId) {
            const [pkg] = await tx
              .select({
                price: packages.price,
                customPrice: packages.customPrice,
              })
              .from(packages)
              .where(eq(packages.id, proj.selectedPackageId))
              .limit(1);
            if (pkg) {
              unitPrice = Number(pkg.customPrice ?? pkg.price) || 0;
            }
          } else if (proj.billingType === "hours") {
            // Hours: seed project name only; amount 0 — isi via import timesheet / edit manual.
            unitPrice = 0;
          } else if (proj.budget != null) {
            unitPrice = Number(proj.budget) || 0;
          }

          // Always seed one line when project selected (name + amount)
          const amount = String(unitPrice);
          await tx.insert(invoiceItems).values({
            invoiceId: inv.id,
            description: proj.name,
            quantity: "1",
            unitPrice: amount,
            amount,
            sourceType: "manual",
          });

          // inv.tax on insert holds default tax RATE % (same as recalculateInvoice)
          const taxRate = Number(ws?.defaultTaxRate ?? inv.tax ?? 0) || 0;
          const taxAmount = (unitPrice * taxRate) / 100;
          const total = unitPrice + taxAmount;
          await tx
            .update(invoices)
            .set({
              subtotal: amount,
              tax: String(taxAmount),
              total: String(total),
              currency: parsed.currency || proj.currency || inv.currency,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));

          const [refreshed] = await tx
            .select()
            .from(invoices)
            .where(eq(invoices.id, inv.id))
            .limit(1);
          return refreshed ?? inv;
        }
      }

      return inv;
    } catch (err: unknown) {
      // Surface a clean message instead of opaque RSC production digest.
      const cause = err as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
      const code = cause?.cause?.code ?? cause?.code;
      const constraint = cause?.cause?.constraint ?? cause?.constraint;
      if (code === "23505" || constraint === "invoices_workspace_id_invoice_number_unique") {
        throw new Error(
          `Nomor invoice ${invoiceNumber} sudah dipakai. Coba simpan lagi — nomor berikutnya akan digenerate otomatis.`,
        );
      }
      throw err;
    }
  });

  await writeActivityLog(workspaceId, user.id, "created_invoice", "invoice", invoice.id);
  return invoice;
}

export async function updateInvoice(invoiceId: string, input: z.infer<typeof updateInvoiceSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const parsed = updateInvoiceSchema.parse(input);
  const currentInvoice = await assertInvoiceInWorkspace(invoiceId, workspaceId);
  const changesFinancials =
    (parsed.currency !== undefined && parsed.currency !== currentInvoice.currency) ||
    (parsed.tax !== undefined && parsed.tax !== Number(currentInvoice.tax)) ||
    (parsed.discount !== undefined && parsed.discount !== Number(currentInvoice.discount));
  if (changesFinancials) {
    assertInvoiceFinancialsMutable(currentInvoice.status);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.issueDate !== undefined) updateData.issueDate = parsed.issueDate;
  if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate || null;
  if (parsed.currency !== undefined) updateData.currency = parsed.currency;
  if (parsed.status !== undefined) updateData.status = parsed.status;
  if (parsed.notes !== undefined) updateData.notes = parsed.notes;
  if (parsed.terms !== undefined) updateData.terms = parsed.terms;
  if (parsed.discount !== undefined) updateData.discount = String(parsed.discount);
  if (parsed.tax !== undefined) updateData.tax = String(parsed.tax);

  const [inv] = await db
    .update(invoices)
    .set(updateData)
    .where(eq(invoices.id, invoiceId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_invoice", "invoice", invoiceId);

  return inv;
}

// ─── Line Items ───

export async function recalculateInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const [result] = await db
    .select({
      sum: sql<string>`coalesce(sum(${invoiceItems.amount}), '0')`,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const subtotal = result?.sum || "0";

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) throw new Error("Invoice not found");

  const totals = calculateInvoiceTotals(
    Number(subtotal),
    Number(inv.discount),
    Number(inv.tax),
  );

  const [updated] = await db
    .update(invoices)
    .set({
      subtotal: String(totals.subtotal),
      discount: String(totals.discount),
      tax: String(totals.tax),
      total: String(totals.total),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updated;
}

export async function addInvoiceItem(input: z.infer<typeof addItemSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const invoice = await assertInvoiceInWorkspace(input.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  const parsed = addItemSchema.parse(input);
  const amount = String(parsed.quantity * parsed.unitPrice);

  const [item] = await db
    .insert(invoiceItems)
    .values({
      invoiceId: parsed.invoiceId,
      description: parsed.description,
      quantity: String(parsed.quantity),
      unitPrice: String(parsed.unitPrice),
      amount,
    })
    .returning();

  await recalculateInvoice(parsed.invoiceId);
  await writeActivityLog(workspaceId, user.id, "added_invoice_item", "invoice_item", item.id);
  return item;
}

export async function updateInvoiceItem(itemId: string, input: z.infer<typeof updateItemSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = updateItemSchema.parse(input);

  const [item] = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .limit(1);
  if (!item) throw new Error("Invoice item not found");

  const invoice = await assertInvoiceInWorkspace(item.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  const qty = parsed.quantity !== undefined ? parsed.quantity : Number(item.quantity);
  const price = parsed.unitPrice !== undefined ? parsed.unitPrice : Number(item.unitPrice);

  const updateData: Record<string, unknown> = {};
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.quantity !== undefined) updateData.quantity = String(parsed.quantity);
  if (parsed.unitPrice !== undefined) updateData.unitPrice = String(parsed.unitPrice);
  updateData.amount = String(qty * price);

  const [updated] = await db
    .update(invoiceItems)
    .set(updateData)
    .where(eq(invoiceItems.id, itemId))
    .returning();

  await recalculateInvoice(item.invoiceId);
  await writeActivityLog(workspaceId, user.id, "updated_invoice_item", "invoice_item", itemId);
  return updated;
}

export async function deleteInvoiceItem(itemId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [item] = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .limit(1);
  if (!item) throw new Error("Invoice item not found");

  const invoice = await assertInvoiceInWorkspace(item.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  await db.transaction(async (tx) => {
    await tx.delete(invoiceItems).where(eq(invoiceItems.id, itemId));

    // Restore time entry so it can be re-imported (was stuck as "invoiced").
    if (item.sourceType === "time_entry" && item.sourceId) {
      const [stillLinked] = await tx
        .select({ id: invoiceItems.id })
        .from(invoiceItems)
        .where(
          and(
            eq(invoiceItems.sourceType, "time_entry"),
            eq(invoiceItems.sourceId, item.sourceId),
          ),
        )
        .limit(1);

      if (!stillLinked) {
        await tx
          .update(timeEntries)
          .set({ status: "approved", updatedAt: new Date() })
          .where(
            and(
              eq(timeEntries.id, item.sourceId),
              eq(timeEntries.workspaceId, workspaceId),
              eq(timeEntries.status, "invoiced"),
            ),
          );
      }
    }
  });

  await recalculateInvoice(item.invoiceId);
  await writeActivityLog(workspaceId, user.id, "deleted_invoice_item", "invoice_item", itemId);
  return { success: true };
}

// ─── Import Time Entries ───

export async function importTimeEntries(input: z.infer<typeof importTimeSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = importTimeSchema.parse(input);
  const inv = await assertInvoiceInWorkspace(parsed.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(inv.status);

  for (const teId of parsed.timeEntryIds) {
    const [te] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, teId), eq(timeEntries.workspaceId, workspaceId)))
      .limit(1);
    if (!te) continue;
    if (te.status === "invoiced") continue;
    // Invoice bound to a project → reject time from other projects.
    if (inv.projectId && te.projectId !== inv.projectId) continue;
    // Always keep client match.
    if (te.clientId !== inv.clientId) continue;

    const minutes = te.durationMinutes || 0;
    const hours = minutes / 60;
    let rate = te.hourlyRate ? Number(te.hourlyRate) : 0;

    // Resolve project name + rate together (used for line description + billing).
    let projectName: string | null = null;
    if (te.projectId) {
      const [proj] = await db
        .select({ name: projects.name, rate: projects.rate })
        .from(projects)
        .where(eq(projects.id, te.projectId))
        .limit(1);
      if (proj?.name) projectName = proj.name;
      if ((!rate || !Number.isFinite(rate) || rate <= 0) && proj?.rate) {
        const projectRate = Number(proj.rate);
        if (Number.isFinite(projectRate) && projectRate > 0) {
          rate = projectRate;
        }
      }
    }

    // Fallback chain: entry rate → project rate → workspace default
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      const [wsRate] = await db
        .select({ defaultHourlyRate: workspaces.defaultHourlyRate })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (wsRate?.defaultHourlyRate) {
        const wsDefault = Number(wsRate.defaultHourlyRate);
        if (Number.isFinite(wsDefault) && wsDefault > 0) {
          rate = wsDefault;
        }
      }
    }

    // Persist resolved rate on the time entry so UI + future imports stay consistent.
    if (rate > 0 && (!te.hourlyRate || Number(te.hourlyRate) <= 0)) {
      await db
        .update(timeEntries)
        .set({ hourlyRate: String(rate), updatedAt: new Date() })
        .where(eq(timeEntries.id, teId));
    }

    const amount = hours * rate;
    const workDesc = (te.description || "").trim() || "Time entry";
    // Client-facing: "Project — work description" so PDF/line items show project context.
    const lineDescription = projectName ? `${projectName} — ${workDesc}` : workDesc;

    // Check if already imported to this invoice (via sourceId)
    const [existing] = await db
      .select()
      .from(invoiceItems)
      .where(
        and(
          eq(invoiceItems.invoiceId, parsed.invoiceId),
          eq(invoiceItems.sourceType, "time_entry"),
          eq(invoiceItems.sourceId, teId),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(invoiceItems).values({
        invoiceId: parsed.invoiceId,
        description: lineDescription,
        quantity: String(hours),
        unitPrice: String(rate),
        amount: String(amount),
        sourceType: "time_entry",
        sourceId: teId,
      });
    }

    await db
      .update(timeEntries)
      .set({ status: "invoiced", updatedAt: new Date() })
      .where(eq(timeEntries.id, teId));
  }

  await recalculateInvoice(parsed.invoiceId);
  await writeActivityLog(workspaceId, user.id, "imported_time_to_invoice", "invoice", parsed.invoiceId);
  return { success: true };
}

// ─── Payments ───

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(input.invoiceId, workspaceId);

  const parsed = recordPaymentSchema.parse(input);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, parsed.invoiceId))
    .limit(1);
  if (!inv) throw new Error("Invoice not found");

  const [paidResult] = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}), '0')`,
    })
    .from(payments)
    .where(eq(payments.invoiceId, parsed.invoiceId));

  assertPaymentWithinRemaining(
    parsed.amount,
    Number(inv.total),
    Number(paidResult?.total ?? 0),
  );

  const [payment] = await db
    .insert(payments)
    .values({
      invoiceId: parsed.invoiceId,
      amount: String(parsed.amount),
      paidAt: parsed.paidAt,
      method: parsed.method || null,
      notes: parsed.notes || null,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "recorded_payment", "payment", payment.id);
  return payment;
}

// ─── Send / Shared Token ───

async function sendInvoiceEmailForInvoice(
  invoiceId: string,
  actorId: string,
  workspaceId: string,
  message?: string,
  reportRange?: { from: string; to: string },
) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!inv) throw new Error("Invoice not found");

  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  if (!client?.email) throw new Error("Client email is missing");

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  let projectName: string | undefined;
  if (inv.projectId) {
    const [proj] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, inv.projectId))
      .limit(1);
    projectName = proj?.name;
  }

  // Raw share tokens shown once — rotate fresh link each send.
  const generated = await generateInvoiceShareToken(invoiceId);
  // Mark sent before email so public PDF link works immediately.
  if (inv.status !== "paid") {
    await db
      .update(invoices)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://cubiqlo.com"
  ).replace(/\/$/, "");
  // Same PDF layout as /api/invoices/:id/pdf (Unduh PDF) — public via share token.
  const portalUrl = `${appUrl}/api/invoices/share/${generated.token}/pdf`;
  let detailReportUrl: string | null = null;
  if (reportRange) {
    const range = normalizeInvoiceReportRange(reportRange.from, reportRange.to);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) throw new Error("Server secret belum dikonfigurasi");
    detailReportUrl = buildInvoiceReportUrl(
      appUrl,
      generated.token,
      range,
      signInvoiceReportRange(generated.token, range, secret),
    );
  }
  const replyTo = await resolveWorkspaceReplyTo(workspaceId);
  await notifyInvoiceSent({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    portalUrl,
    workspaceName: ws?.name,
    replyTo,
    projectName,
    dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
    customBody: message ? validateInvoiceMessage(message) : null,
    detailReportUrl,
  });

  await writeActivityLog(workspaceId, actorId, "sent_invoice_email", "invoice", invoiceId, {
    clientEmail: client.email,
    portalUrl,
  });

  try {
    await notifyWorkspaceMembers(workspaceId, {
      type: "invoice_sent",
      title: `Invoice ${inv.invoiceNumber} sent`,
      body: `${client.name} · ${formatMoney(inv.total, inv.currency || "IDR")}`,
      link: `/app/invoices/${invoiceId}`,
      entityType: "invoice",
      entityId: invoiceId,
      actorId,
    });
  } catch {
    // best-effort
  }

  return { success: true, portalUrl };
}

export async function sendInvoiceEmail(
  invoiceId: string,
  message: string,
  reportRange?: { from: string; to: string },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);
  return sendInvoiceEmailForInvoice(
    invoiceId,
    user.id,
    workspaceId,
    validateInvoiceMessage(message),
    reportRange,
  );
}

export async function generateInvoiceShareToken(invoiceId: string, expiresAt?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db
    .update(invoices)
    .set({
      sharedTokenHash: tokenHash,
      sharedTokenExpiresAt: expiry,
      sharedTokenRevokedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "generated_invoice_share_token", "invoice", invoiceId);
  return { token: rawToken, expiresAt: expiry };
}

export async function revokeInvoiceShareToken(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  await db
    .update(invoices)
    .set({
      sharedTokenRevokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "revoked_invoice_share_token", "invoice", invoiceId);
  return { success: true };
}

export async function markOverdueInvoices(workspaceId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const conditions = [
    lt(invoices.dueDate, today),
    inArray(invoices.status, ["sent", "viewed"]),
  ];
  if (workspaceId) conditions.push(eq(invoices.workspaceId, workspaceId));

  const updated = await db
    .update(invoices)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: invoices.id, workspaceId: invoices.workspaceId, invoiceNumber: invoices.invoiceNumber });

  for (const inv of updated) {
    await writeActivityLog(inv.workspaceId, null, "marked_invoice_overdue", "invoice", inv.id);
    try {
      await notifyWorkspaceMembers(inv.workspaceId, {
        type: "invoice_overdue",
        title: `Invoice ${inv.invoiceNumber} is overdue`,
        body: "Payment reminder may be sent from invoice detail.",
        link: `/app/invoices/${inv.id}`,
        entityType: "invoice",
        entityId: inv.id,
      });
    } catch {
      // best-effort
    }
  }

  return { updated: updated.length, invoices: updated };
}

export async function sendInvoicePaymentReminder(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const inv = await assertInvoiceInWorkspace(invoiceId, workspaceId);
  if (["paid", "cancelled", "draft"].includes(inv.status)) {
    throw new Error("Only sent, viewed, or overdue invoices can receive reminders");
  }

  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  if (!client?.email) throw new Error("Client email is missing");

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const generated = await generateInvoiceShareToken(invoiceId);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://cubiqlo.com"
  ).replace(/\/$/, "");
  const portalUrl = `${appUrl}/api/invoices/share/${generated.token}/pdf`;
  const replyTo = await resolveWorkspaceReplyTo(workspaceId);

  await notifyInvoicePaymentReminder({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    dueDate: inv.dueDate ? String(inv.dueDate) : null,
    portalUrl,
    workspaceName: ws?.name,
    replyTo,
  });

  await db
    .update(invoices)
    .set({ status: inv.status === "paid" ? inv.status : "overdue", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "sent_invoice_payment_reminder", "invoice", invoiceId, {
    clientEmail: client.email,
    portalUrl,
  });

  try {
    // One-shot event (user clicked send reminder) — not a recurring overdue ping.
    await notifyWorkspaceMembers(workspaceId, {
      type: "invoice_sent",
      title: `Reminder sent for ${inv.invoiceNumber}`,
      body: `${client.name} · ${formatMoney(inv.total, inv.currency || "IDR")}`,
      link: `/app/invoices/${invoiceId}`,
      entityType: "invoice",
      entityId: invoiceId,
      actorId: user.id,
      dedupe: false,
    });
  } catch {
    // best-effort
  }

  return { success: true, portalUrl };
}

// ─── Queries ───

export async function listInvoices(workspaceId: string, clientId?: string, status?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, wsId);

  const conditions = [eq(invoices.workspaceId, wsId)];
  if (clientId) conditions.push(eq(invoices.clientId, clientId));
  if (status) conditions.push(eq(invoices.status, status as typeof invoices.status.enumValues[number]));

  const results = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientCompany: clients.companyName,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  return results;
}

export async function getInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);

  if (!inv) throw new Error("Invoice not found");

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  return { ...inv, items, payments: pays, client: client || null };
}

export async function getInvoiceBySharedToken(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.sharedTokenHash, tokenHash))
    .limit(1);

  if (!inv) throw new Error("Invalid or expired share link");

  if (inv.sharedTokenRevokedAt) throw new Error("This share link has been revoked");
  if (inv.sharedTokenExpiresAt && new Date(inv.sharedTokenExpiresAt) < new Date()) {
    throw new Error("This share link has expired");
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, inv.workspaceId))
    .limit(1);

  return { ...inv, items, client: client || null, workspace: ws || null };
}
