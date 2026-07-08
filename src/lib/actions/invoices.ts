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
} from "@/db/schema";
import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireUser, assertWorkspaceWritable, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyInvoicePaymentReminder, notifyInvoiceSent } from "@/lib/notifications";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { formatMoney } from "@/lib/utils";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

// ─── Schemas ───

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled"]).optional(),
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

  const [ws] = await db
    .select({ defaultCurrency: workspaces.defaultCurrency, defaultTaxRate: workspaces.defaultTaxRate, defaultInvoiceTerms: workspaces.defaultInvoiceTerms })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const invoice = await db.transaction(async (tx) => {
    // Generate invoice number inside transaction.
    // The counter is authoritative once it exists; first-ever insert seeds
    // from the largest existing standard invoice number to avoid collisions
    // when seed data already used INV-0001.
    const [counter] = await tx
      .select()
      .from(workspaceInvoiceCounters)
      .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId))
      .for("update")
      .limit(1);

    let invoiceNumber: string;
    if (!counter) {
      const [maxRow] = await tx
        .select({
          maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber} FROM 'INV-([0-9]+)$') AS INTEGER)), 0)`,
        })
        .from(invoices)
        .where(eq(invoices.workspaceId, workspaceId));

      const nextNum = (maxRow?.maxNum ?? 0) + 1;
      invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;
      await tx.insert(workspaceInvoiceCounters).values({
        workspaceId,
        nextNumber: nextNum + 1,
      });
    } else {
      const num = counter.nextNumber;
      invoiceNumber = `INV-${String(num).padStart(4, "0")}`;
      await tx
        .update(workspaceInvoiceCounters)
        .set({ nextNumber: num + 1, updatedAt: new Date() })
        .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId));
    }

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
        tax: ws?.defaultTaxRate || "0",
        total: "0",
        status: "draft",
        notes: parsed.notes || null,
        terms: parsed.terms || ws?.defaultInvoiceTerms || null,
      })
      .returning();

    return inv;
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

  // Detect draft -> sent transition so we can email the client.
  let priorStatus: string | null = null;
  if (parsed.status !== undefined && parsed.status === "sent") {
    const [prev] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    priorStatus = prev?.status ?? null;
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

  // Fire client email on first transition to "sent"
  if (priorStatus === "draft" && inv.status === "sent") {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "https://cubiqlo.com";
      const [client] = await db
        .select({ name: clients.name, email: clients.email })
        .from(clients)
        .where(eq(clients.id, inv.clientId))
        .limit(1);
      const [ws] = await db
        .select({ name: workspaces.name, replyToEmail: workspaces.replyToEmail })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (client?.email) {
        const portalUrl = `${appUrl}/invoice/${inv.id}`;
        await notifyInvoiceSent({
          clientEmail: client.email,
          clientName: client.name ?? "there",
          invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
          amount: `${inv.currency} ${inv.total}`,
          portalUrl,
          workspaceName: ws?.name,
          replyTo: ws?.replyToEmail ?? undefined,
        });
      }
    } catch (err) {
      console.error("[invoice-send-notify-fail]", err);
    }
  }

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
  const taxRate = inv ? Number(inv.tax) : 0;
  const taxAmount = (Number(subtotal) * taxRate) / 100;
  const total = Number(subtotal) + taxAmount;

  const [updated] = await db
    .update(invoices)
    .set({
      subtotal: String(subtotal),
      tax: String(taxAmount),
      total: String(total),
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
  await assertInvoiceInWorkspace(input.invoiceId, workspaceId);

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

  await assertInvoiceInWorkspace(item.invoiceId, workspaceId);

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

  await assertInvoiceInWorkspace(item.invoiceId, workspaceId);

  await db.delete(invoiceItems).where(eq(invoiceItems.id, itemId));
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
  const _inv = await assertInvoiceInWorkspace(parsed.invoiceId, workspaceId);

  for (const teId of parsed.timeEntryIds) {
    const [te] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, teId), eq(timeEntries.workspaceId, workspaceId)))
      .limit(1);
    if (!te) continue;
    if (te.status === "invoiced") continue;

    const minutes = te.durationMinutes || 0;
    const hours = minutes / 60;
    const rate = te.hourlyRate ? Number(te.hourlyRate) : 0;
    const amount = hours * rate;

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
        description: te.description || "Time entry",
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

  // Check if invoice fully paid
  const [totalResult] = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}), '0')`,
    })
    .from(payments)
    .where(eq(payments.invoiceId, parsed.invoiceId));

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, parsed.invoiceId))
    .limit(1);

  if (inv && Number(totalResult.total) >= Number(inv.total)) {
    await db
      .update(invoices)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(invoices.id, parsed.invoiceId));

    // In-app notify whole workspace about payment received
    try {
      await notifyWorkspaceMembers(workspaceId, {
        type: "invoice_paid",
        title: `Invoice ${inv.invoiceNumber} marked paid`,
        body: formatMoney(inv.total, inv.currency || "IDR"),
        link: `/app/invoices/${parsed.invoiceId}`,
        entityType: "invoice",
        entityId: parsed.invoiceId,
        actorId: user.id,
      });
    } catch {
      // best-effort
    }
  }

  await writeActivityLog(workspaceId, user.id, "recorded_payment", "payment", payment.id);
  return payment;
}

// ─── Send / Shared Token ───

async function sendInvoiceEmailForInvoice(invoiceId: string, actorId: string, workspaceId: string) {
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
    .select({ name: workspaces.name, replyToEmail: workspaces.replyToEmail })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // Raw share tokens are shown only once, so sending always rotates a fresh link.
  const generated = await generateInvoiceShareToken(invoiceId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "https://cubiqlo.com";
  const portalUrl = `${appUrl}/invoice/${generated.token}`;
  await notifyInvoiceSent({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    portalUrl,
    workspaceName: ws?.name,
    replyTo: ws?.replyToEmail ?? undefined,
  });

  await db
    .update(invoices)
    .set({ status: inv.status === "paid" ? inv.status : "sent", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

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

export async function sendInvoiceEmail(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);
  return sendInvoiceEmailForInvoice(invoiceId, user.id, workspaceId);
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
    .select({ name: workspaces.name, replyToEmail: workspaces.replyToEmail })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const generated = await generateInvoiceShareToken(invoiceId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "https://cubiqlo.com";
  const portalUrl = `${appUrl}/invoice/${generated.token}`;

  await notifyInvoicePaymentReminder({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    dueDate: inv.dueDate ? String(inv.dueDate) : null,
    portalUrl,
    workspaceName: ws?.name,
    replyTo: ws?.replyToEmail ?? undefined,
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
    await notifyWorkspaceMembers(workspaceId, {
      type: "invoice_overdue",
      title: `Reminder sent for ${inv.invoiceNumber}`,
      body: `${client.name} · ${formatMoney(inv.total, inv.currency || "IDR")}`,
      link: `/app/invoices/${invoiceId}`,
      entityType: "invoice",
      entityId: invoiceId,
      actorId: user.id,
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
