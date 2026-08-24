"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { proposals, projects, projectServices, invoices, invoiceItems, workspaceInvoiceCounters, workspaces, proposalTemplates, clients } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { sendNotification } from "@/lib/notifications";
import { resolveWorkspaceReplyTo } from "@/lib/workspace-reply-to";
import { assertPublicTokenLifecycle, PublicTokenError } from "@/lib/public-token-policy";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { buildProjectServiceDocumentLines } from "@/lib/project-service-lines";
import { normalizeDocumentBlocks, isSameOriginMediaSrc, type DocumentBlock } from "@/lib/document-blocks";
import {
  buildProposalNumber,
  currentDocumentYear,
  nextDocumentSequence,
  proposalNumberSequence,
} from "@/lib/document-numbers";

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
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().trim().min(1).max(200).optional(),
  clientEmail: z.string().email().optional().nullable(),
  companyName: z.string().trim().max(200).optional().nullable(),
  proposalNumber: z.string().trim().max(100).optional().nullable(),
  projectIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().max(10000).optional().nullable(),
  contentBlocks: z.unknown().optional(),
  lineItems: z.array(lineItemSchema).default([]),
  currency: z.string().min(3).max(3).default("IDR"),
  taxRate: z.number().min(0).max(100).default(0),
  downPaymentPercent: z.number().min(0).max(100).default(50),
  validUntil: z.string().optional().nullable(),
});

const updateProposalSchema = z.object({
  clientName: z.string().trim().min(1).max(200).optional(),
  clientEmail: z.string().email().nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
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
  let recipient = { name: parsed.clientName?.trim() ?? "", email: parsed.clientEmail ?? null, company: parsed.companyName ?? null };
  if (parsed.clientId) {
    const client = await assertClientInWorkspace(db, user.id, parsed.workspaceId, parsed.clientId);
    recipient = { name: client.name, email: client.email, company: client.companyName ?? null };
  }
  if (!recipient.name) throw new Error("Nama client wajib diisi");
  // Re-fetch the template server-side when one is selected: the client list
  // is only used to render the picker. The workspace-scoped row is the source
  // of truth for the document content (legacy markdown body + unified
  // contentBlocks), so a tampered client payload can never smuggle
  // foreign-template content into the new proposal. Billing metadata
  // (currency/tax/DP/line items) stays as sent by the form — applyTemplate
  // prefills those from the workspace-scoped template list and the user can
  // still edit them before submit.
  let templateBlocks: DocumentBlock[] = [];
  let templateBody: string | null = null;
  if (parsed.templateId) {
    const [template] = await db.select({
      id: proposalTemplates.id,
      body: proposalTemplates.body,
      contentBlocks: proposalTemplates.contentBlocks,
    }).from(proposalTemplates)
      .where(and(eq(proposalTemplates.id, parsed.templateId), eq(proposalTemplates.workspaceId, parsed.workspaceId)))
      .limit(1);
    if (!template) throw new Error("Proposal template access denied");
    templateBlocks = normalizeDocumentBlocks(template.contentBlocks, "proposal");
    templateBody = template.body;
  }
  // Template blocks win when present; otherwise fall back to the client-sent
  // blocks (legacy create without a template), then to nothing.
  const contentBlocks = templateBlocks.length > 0
    ? templateBlocks
    : normalizeDocumentBlocks(parsed.contentBlocks, "proposal");
  // Legacy body fallback: template body is canonical when a template was
  // picked (the form copies it into the scope textarea); otherwise the client
  // body is used.
  const body = parsed.templateId ? (templateBody || parsed.body) : parsed.body;
  const projectIds = Array.from(new Set(parsed.projectIds ?? []));
  if ((parsed.projectIds?.length ?? 0) !== projectIds.length) throw new Error("Proyek duplikat tidak diizinkan");
  const generatedLineItems: Array<z.infer<typeof lineItemSchema>> = [];
  for (const projectId of projectIds) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(
      eq(projects.id, projectId),
      eq(projects.workspaceId, parsed.workspaceId),
      ...(parsed.clientId ? [eq(projects.clientId, parsed.clientId)] : []),
    )).limit(1);
    if (!project) throw new Error("Ada proyek yang tidak sesuai dengan klien");
    const serviceRows = await db.select({
      id: projectServices.id,
      nameSnapshot: projectServices.nameSnapshot,
      descriptionSnapshot: projectServices.descriptionSnapshot,
      quantity: projectServices.quantity,
      unitPrice: projectServices.unitPrice,
      amount: projectServices.amount,
      currencySnapshot: projectServices.currencySnapshot,
      status: projectServices.status,
    }).from(projectServices).where(and(
      eq(projectServices.workspaceId, parsed.workspaceId),
      eq(projectServices.projectId, projectId),
      eq(projectServices.status, "active"),
    ));
    generatedLineItems.push(...buildProjectServiceDocumentLines(serviceRows, parsed.currency).map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
    })));
  }
  const lineItems = [...parsed.lineItems, ...generatedLineItems];
  const { subtotal, tax, total } = computeTotals(lineItems, parsed.taxRate);

  // Generate the proposal number inside a transaction.
  // Counter is authoritative, but always bump above MAX(existing PROP-YYYY-####)
  // so seed data / manual inserts cannot collide with the unique index
  // `proposals_workspace_proposal_number_unique` (drizzle/0074).
  const [proposal] = await db.transaction(async (tx) => {
    let proposalNumber = parsed.proposalNumber?.trim() || buildProposalNumber(currentDocumentYear(), 1);

    if (!parsed.proposalNumber?.trim()) {
      const [counter] = await tx
        .select({ nextNumber: workspaceInvoiceCounters.nextNumber })
        .from(workspaceInvoiceCounters)
        .where(eq(workspaceInvoiceCounters.workspaceId, parsed.workspaceId))
        .for("update")
        .limit(1);
      const existing = await tx.select({ proposalNumber: proposals.proposalNumber })
        .from(proposals)
        .where(eq(proposals.workspaceId, parsed.workspaceId));
      const seq = nextDocumentSequence(
        counter?.nextNumber,
        existing.map((row) => row.proposalNumber),
        proposalNumberSequence,
      );
      const generated = buildProposalNumber(currentDocumentYear(), seq);
      if (!counter) {
        await tx.insert(workspaceInvoiceCounters).values({ workspaceId: parsed.workspaceId, nextNumber: seq + 1 });
      } else {
        await tx.update(workspaceInvoiceCounters)
          .set({ nextNumber: seq + 1, updatedAt: new Date() })
          .where(eq(workspaceInvoiceCounters.workspaceId, parsed.workspaceId));
      }
      proposalNumber = generated;
    }

    return tx.insert(proposals).values({
      workspaceId: parsed.workspaceId,
      clientId: parsed.clientId,
      clientName: recipient.name,
      clientEmail: recipient.email,
      companyName: recipient.company,
      proposalNumber,
      title: parsed.title,
      body,
      contentBlocks,
      lineItems,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      currency: parsed.currency,
      downPaymentPercent: parsed.downPaymentPercent.toFixed(2),
      validUntil: parsed.validUntil || null,
      status: "draft",
      createdBy: user.id,
    }).returning();
  });

  await writeActivityLog(parsed.workspaceId, user.id, "created_proposal", "proposal", proposal.id, {
    title: proposal.title,
    total: proposal.total,
  });
  revalidatePath("/app/proposals");
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
      clientName: parsed.clientName ?? existing.clientName,
      clientEmail: parsed.clientEmail !== undefined ? parsed.clientEmail : existing.clientEmail,
      companyName: parsed.companyName !== undefined ? parsed.companyName : existing.companyName,
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
  revalidatePath("/app/proposals");
  revalidatePath(`/app/proposals/${proposalId}`);
  return proposal;
}

export async function sendProposal(proposalId: string, customMessage?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Proposal not found");
  if (existing.status === "accepted") throw new Error("Already accepted");

  if (!existing.clientEmail) throw new Error("Client email is missing");
  const recipientEmail = existing.clientEmail;
  const recipientName = existing.clientName;
  const [ws] = await db.select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Transactional send: lock the row, guard the status transition, and only
  // commit the sent status + rotated token AFTER the client email succeeded.
  // If the email fails, throw so the transaction rolls back — the proposal
  // stays in its previous status and the previous link stays valid.
  await db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: proposals.id, status: proposals.status })
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .for("update")
      .limit(1);
    if (!locked) throw new Error("Proposal not found");
    if (locked.status === "accepted") throw new Error("Already accepted");

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "https://cubiqlo.com"
    ).replace(/\/$/, "");
    const replyTo = await resolveWorkspaceReplyTo(workspaceId);
    const proposalUrl = `${appUrl}/proposal/${token}`;
    const text = (
      customMessage?.trim() ||
      `Hi ${recipientName || "there"},\n\n` +
        `${ws?.name || "Cubiqlo"} sent you a proposal: "${existing.title}".\n\n` +
        `Review it here:\n{{proposal_link}}\n\n` +
        `This link is valid for 30 days. If you have any questions, just reply to this email.`
    ).replace(/\{\{proposal_link\}\}/g, proposalUrl);
    const emailResult = await sendNotification({
      to: recipientEmail,
      subject: `Proposal: ${existing.title}`,
      text,
      type: "proposal_sent",
      replyTo,
    });
    if (!emailResult.success) {
      throw new Error("Failed to send proposal email — proposal was not marked as sent");
    }

    await tx.update(proposals)
      .set({
        status: "sent",
        sharedTokenHash: tokenHash,
        sharedTokenExpiresAt: expiresAt,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposalId));
  });

  await writeActivityLog(workspaceId, user.id, "sent_proposal", "proposal", proposalId);
  revalidatePath("/app/proposals");
  revalidatePath(`/app/proposals/${proposalId}`);
  return { id: proposalId, token };
}

const blockSaveSchema = z.object({
  contentBlocks: z.unknown(),
  revision: z.number().int().min(1).optional(),
});

/**
 * Save proposal editor blocks with stale-write protection. The caller must
 * send the `contentRevision` it loaded (defaults to 1 for legacy clients).
 * The update is a compare-and-swap: it only lands when the stored revision
 * still matches, and atomically bumps the revision on success. A save that
 * raced with another tab/autosave is rejected so the newer content is never
 * silently overwritten.
 */
export async function saveProposalBlocks(proposalId: string, input: z.infer<typeof blockSaveSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = blockSaveSchema.parse(input);
  const blocks = normalizeDocumentBlocks(parsed.contentBlocks, "proposal");
  for (const block of blocks) {
    if (block.type === "image" && block.src && !isSameOriginMediaSrc(block.src)) {
      // Media blocks must reference files uploaded through the workspace
      // upload proxy; external URLs would bypass upload validation/quota.
      throw new Error("Gambar hanya bisa dari file workspace");
    }
  }
  const expectedRevision = parsed.revision ?? 1;
  const [updated] = await db.update(proposals)
    .set({ contentBlocks: blocks, contentRevision: sql`${proposals.contentRevision} + 1`, updatedAt: new Date() })
    .where(and(
      eq(proposals.id, proposalId),
      eq(proposals.workspaceId, workspaceId),
      eq(proposals.status, "draft"),
      eq(proposals.contentRevision, expectedRevision),
    ))
    .returning();
  if (!updated) {
    const [existing] = await db.select({ id: proposals.id, status: proposals.status, contentRevision: proposals.contentRevision })
      .from(proposals)
      .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
      .limit(1);
    if (!existing || existing.status !== "draft") throw new Error("Proposal not found or not editable");
    throw new Error("Perubahan sudah kedaluwarsa — dokumen diubah di tab lain. Muat ulang untuk melanjutkan.");
  }
  revalidatePath(`/app/proposals/${proposalId}`);
  return updated;
}

export async function deleteProposal(proposalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Proposal not found");
  if (existing.status === "accepted") {
    throw new Error("Proposal yang sudah diterima tidak bisa dihapus");
  }

  const [p] = await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId)))
    .returning();
  if (!p) throw new Error("Proposal not found");
  await writeActivityLog(workspaceId, user.id, "deleted_proposal", "proposal", proposalId);
  revalidatePath("/app/proposals");
  return { id: proposalId };
}

// ─── Public accept/decline (no auth — uses token) ───

export async function acceptProposalPublic(proposalId: string, token: string) {
  const tokenHash = hashToken(token);
  await enforceServerActionRateLimit("proposal:accept", tokenHash, { limit: 10, windowSec: 300 });

  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id FROM proposals
      WHERE id = ${proposalId}
      FOR UPDATE
    `);
    if (locked.rowCount === 0) throw new Error("Proposal not found");

    const [p] = await tx.select().from(proposals)
      .where(eq(proposals.id, proposalId))
      .limit(1);
    if (!p) throw new Error("Proposal not found");
    try {
      assertPublicTokenLifecycle({
        presentedHash: tokenHash,
        storedHash: p.sharedTokenHash,
        revokedAt: p.sharedTokenRevokedAt,
        expiresAt: p.sharedTokenExpiresAt,
        status: p.status,
        allowedStatuses: ["sent", "viewed", "accepted"],
        processedStatuses: ["declined"],
      });
    } catch (error) {
      if (error instanceof PublicTokenError) {
        const messages = {
          invalid: "Invalid token",
          disabled: "Proposal link disabled",
          revoked: "Proposal link revoked",
          expired: "Proposal link expired",
          processed: "Proposal was declined",
          unavailable: "Proposal is not available",
        } as const;
        throw new Error(messages[error.code]);
      }
      throw error;
    }
    if (p.status === "accepted") {
      return { id: proposalId, alreadyAccepted: true, projectId: p.projectId };
    }

    let clientId = p.clientId;
    if (!clientId) {
      const email = p.clientEmail?.trim().toLowerCase();
      if (!email) throw new Error("Proposal recipient email is required");
      const [existingClient] = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.workspaceId, p.workspaceId), sql`lower(${clients.email}) = ${email}`))
        .limit(1);
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const [createdClient] = await tx.insert(clients).values({
          workspaceId: p.workspaceId,
          name: p.clientName || email,
          email,
          companyName: p.companyName || null,
        }).returning({ id: clients.id });
        clientId = createdClient.id;
      }
      await tx.update(proposals).set({ clientId }).where(eq(proposals.id, p.id));
    }
    const projectId = crypto.randomUUID();
    if (!clientId) throw new Error("Proposal recipient client could not be resolved");
    await tx.insert(projects).values({
      workspaceId: p.workspaceId,
      clientId,
      name: p.title,
      status: "active",
    });

    const [counter] = await tx.insert(workspaceInvoiceCounters)
      .values({ workspaceId: p.workspaceId, nextNumber: 2 })
      .onConflictDoUpdate({
        target: workspaceInvoiceCounters.workspaceId,
        set: {
          nextNumber: sql`${workspaceInvoiceCounters.nextNumber} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ nextNumber: workspaceInvoiceCounters.nextNumber });
    const allocatedNumber = counter.nextNumber - 1;
    const invoiceNumber = `INV-${String(allocatedNumber).padStart(4, "0")}`;
    const downPaymentAmount = parseFloat(p.total) * (parseFloat(p.downPaymentPercent) / 100);
    const dpTotal = downPaymentAmount;

    const invoiceId = crypto.randomUUID();
    await tx.insert(invoices).values({
      id: invoiceId,
      workspaceId: p.workspaceId,
      clientId,
      invoiceNumber,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      currency: p.currency,
      subtotal: dpTotal.toFixed(2),
      discount: "0",
      tax: "0.00",
      total: dpTotal.toFixed(2),
      status: "draft",
      notes: `Down payment (${p.downPaymentPercent}%) for proposal: ${p.title}`,
    });
    await tx.insert(invoiceItems).values({
      invoiceId,
      description: `Down payment (${p.downPaymentPercent}%) — ${p.title}`,
      quantity: "1",
      unitPrice: dpTotal.toFixed(2),
      amount: dpTotal.toFixed(2),
      sourceType: "manual",
    });

    await tx.update(proposals)
      .set({
        status: "accepted",
        projectId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, p.status)));

    return {
      id: proposalId,
      projectId,
      invoiceId,
      invoiceNumber,
      downPaymentAmount: dpTotal,
      currency: p.currency,
    };
  });
}

export async function declineProposalPublic(proposalId: string, token: string, reason?: string) {
  const tokenHash = hashToken(token);
  await enforceServerActionRateLimit("proposal:decline", tokenHash, { limit: 10, windowSec: 300 });
  const [p] = await db.select().from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!p) throw new Error("Proposal not found");
  try {
    assertPublicTokenLifecycle({
      presentedHash: tokenHash,
      storedHash: p.sharedTokenHash,
      revokedAt: p.sharedTokenRevokedAt,
      expiresAt: p.sharedTokenExpiresAt,
      status: p.status,
      allowedStatuses: ["sent", "viewed", "declined"],
      processedStatuses: ["accepted"],
    });
  } catch (error) {
    if (error instanceof PublicTokenError) {
      const messages = {
        invalid: "Invalid token",
        disabled: "Proposal link disabled",
        revoked: "Proposal link revoked",
        expired: "Proposal link expired",
        processed: "Already accepted",
        unavailable: "Proposal is not available",
      } as const;
      throw new Error(messages[error.code]);
    }
    throw error;
  }
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
