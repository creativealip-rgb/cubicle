"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { proposals, projects, invoices, invoiceItems, workspaces, workspaceInvoiceCounters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

const createProposalSchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(10000).optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
  currency: z.string().min(3).max(3).default("IDR"),
  taxRate: z.number().min(0).max(100).default(0),
  downPaymentPercent: z.number().min(0).max(100).default(50),
  validUntil: z.string().optional().nullable(),
});

const updateProposalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(10000).optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  currency: z.string().min(3).max(3).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  downPaymentPercent: z.number().min(0).max(100).optional(),
  validUntil: z.string().optional().nullable(),
});

function computeTotals(lineItems: Array<{ amount: number }>, taxRate: number) {
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createProposal(input: z.infer<typeof createProposalSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createProposalSchema.parse(input);
  const { subtotal, tax, total } = computeTotals(parsed.lineItems, parsed.taxRate);

  const [proposal] = await db.insert(proposals).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    title: parsed.title,
    body: parsed.body || null,
    lineItems: parsed.lineItems,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    currency: parsed.currency,
    downPaymentPercent: parsed.downPaymentPercent.toFixed(2),
    validUntil: parsed.validUntil || null,
    status: "draft",
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_proposal", "proposal", proposal.id, {
    title: proposal.title,
    total: proposal.total,
  });
  return proposal;
}

export async function updateProposal(proposalId: string, input: z.infer<typeof updateProposalSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateProposalSchema.parse(input);

  const [existing] = await db.select().from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Proposal not found");
  if (existing.status !== "draft") throw new Error("Only draft proposals can be edited");

  const lineItems = parsed.lineItems ?? (existing.lineItems as Array<{ amount: number }>);
  const taxRate = parsed.taxRate ?? (existing.tax && existing.subtotal && parseFloat(existing.subtotal) > 0
    ? (parseFloat(existing.tax) / parseFloat(existing.subtotal)) * 100
    : 0);
  const { subtotal, tax, total } = computeTotals(lineItems, taxRate);

  const [proposal] = await db.update(proposals)
    .set({
      title: parsed.title ?? existing.title,
      body: parsed.body !== undefined ? parsed.body : existing.body,
      lineItems,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      currency: parsed.currency ?? existing.currency,
      downPaymentPercent: parsed.downPaymentPercent !== undefined
        ? parsed.downPaymentPercent.toFixed(2)
        : existing.downPaymentPercent,
      validUntil: parsed.validUntil !== undefined ? parsed.validUntil : existing.validUntil,
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, proposalId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_proposal", "proposal", proposalId);
  return proposal;
}

export async function sendProposal(proposalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Proposal not found");
  if (existing.status === "accepted") throw new Error("Already accepted");

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.update(proposals)
    .set({
      status: "sent",
      sharedTokenHash: tokenHash,
      sharedTokenExpiresAt: expiresAt,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, proposalId));

  await writeActivityLog(workspaceId, user.id, "sent_proposal", "proposal", proposalId);
  return { id: proposalId, token };
}

export async function deleteProposal(proposalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [p] = await db.delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .returning();
  if (!p) throw new Error("Proposal not found");
  await writeActivityLog(workspaceId, user.id, "deleted_proposal", "proposal", proposalId);
  return { id: proposalId };
}

// ─── Public accept/decline (no auth — uses token) ───

export async function acceptProposalPublic(proposalId: string, token: string) {
  const tokenHash = hashToken(token);
  const [p] = await db.select().from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!p) throw new Error("Proposal not found");
  if (p.sharedTokenHash !== tokenHash) throw new Error("Invalid token");
  if (p.sharedTokenRevokedAt) throw new Error("Proposal link revoked");
  if (p.sharedTokenExpiresAt && new Date() > p.sharedTokenExpiresAt) throw new Error("Proposal link expired");
  if (p.status === "accepted") {
    return { id: proposalId, alreadyAccepted: true, projectId: p.projectId };
  }
  if (p.status === "declined") throw new Error("Proposal was declined");

  // Create project
  const projectId = crypto.randomUUID();
  await db.insert(projects).values({
    id: projectId,
    workspaceId: p.workspaceId,
    clientId: p.clientId,
    name: p.title,
    status: "active",
  });

  // Create down-payment invoice
  const [counter] = await db.select().from(workspaceInvoiceCounters)
    .where(eq(workspaceInvoiceCounters.workspaceId, p.workspaceId))
    .limit(1);
  const nextNumber = (counter?.nextNumber ?? 1);
  const invoiceNumber = `INV-${String(nextNumber).padStart(4, "0")}`;
  const downPaymentAmount = parseFloat(p.total) * (parseFloat(p.downPaymentPercent) / 100);
  const dpSubtotal = downPaymentAmount;
  const dpTax = 0; // down-payment typically a simple fraction
  const dpTotal = downPaymentAmount;

  const invoiceId = crypto.randomUUID();
  await db.insert(invoices).values({
    id: invoiceId,
    workspaceId: p.workspaceId,
    clientId: p.clientId,
    invoiceNumber,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currency: p.currency,
    subtotal: dpSubtotal.toFixed(2),
    discount: "0",
    tax: dpTax.toFixed(2),
    total: dpTotal.toFixed(2),
    status: "draft",
    notes: `Down payment (${p.downPaymentPercent}%) for proposal: ${p.title}`,
  });
  // Invoice item summary
  await db.insert(invoiceItems).values({
    invoiceId,
    description: `Down payment (${p.downPaymentPercent}%) — ${p.title}`,
    quantity: "1",
    unitPrice: dpTotal.toFixed(2),
    amount: dpTotal.toFixed(2),
    sourceType: "manual",
  });
  // Bump counter
  if (counter) {
    await db.update(workspaceInvoiceCounters)
      .set({ nextNumber: nextNumber + 1, updatedAt: new Date() })
      .where(eq(workspaceInvoiceCounters.workspaceId, p.workspaceId));
  } else {
    await db.insert(workspaceInvoiceCounters).values({
      workspaceId: p.workspaceId,
      nextNumber: nextNumber + 1,
    });
  }

  // Update proposal
  await db.update(proposals)
    .set({
      status: "accepted",
      projectId,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, proposalId));

  return {
    id: proposalId,
    projectId,
    invoiceId,
    invoiceNumber,
    downPaymentAmount: dpTotal,
    currency: p.currency,
  };
}

export async function declineProposalPublic(proposalId: string, token: string, reason?: string) {
  const tokenHash = hashToken(token);
  const [p] = await db.select().from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!p) throw new Error("Proposal not found");
  if (p.sharedTokenHash !== tokenHash) throw new Error("Invalid token");
  if (p.status === "accepted") throw new Error("Already accepted");
  if (p.status === "declined") return { id: proposalId, alreadyDeclined: true };

  await db.update(proposals)
    .set({
      status: "declined",
      declinedAt: new Date(),
      declineReason: reason || null,
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, proposalId));

  return { id: proposalId };
}
