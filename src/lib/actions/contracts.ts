"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { contracts, contractTemplates, clients, projects, workspaces, workspaceInvoiceCounters } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable, assertClientInWorkspace, assertProjectInWorkspace, ForbiddenError } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { sendNotification } from "@/lib/notifications";
import { resolveWorkspaceReplyTo } from "@/lib/workspace-reply-to";
import { assertPublicTokenLifecycle, PublicTokenError } from "@/lib/public-token-policy";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { validateSignatureDataUrl } from "@/lib/upload-safety";
import { createClient } from "@/lib/actions/clients";
import { normalizeDocumentBlocks, type DocumentBlock } from "@/lib/document-blocks";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";
import { resolveDocumentPlaceholders } from "@/lib/document-placeholders";
import {
  buildContractNumber,
  currentDocumentYear,
  contractNumberSequence,
  nextDocumentSequence,
} from "@/lib/document-numbers";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Resolve `{{var}}` placeholders in template body
// Supported: client.name, client.email, project.name, workspace.name, today, valid_until, value, scope
function resolveTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v !== undefined ? v : `{{${key}}}`;
  });
}

// ─── Templates ───

const createTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  isDefault: z.boolean().default(false),
});

export async function createContractTemplate(input: z.infer<typeof createTemplateSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createTemplateSchema.parse(input);

  if (parsed.isDefault) {
    // Unset other defaults
    await db.update(contractTemplates)
      .set({ isDefault: false })
      .where(eq(contractTemplates.workspaceId, parsed.workspaceId));
  }

  const [t] = await db.insert(contractTemplates).values({
    workspaceId: parsed.workspaceId,
    name: parsed.name,
    body: parsed.body,
    isDefault: parsed.isDefault,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_contract_template", "contract_template", t.id, {
    name: t.name,
  });
  revalidatePath("/app/templates");
  revalidatePath("/app/contract-templates");
  revalidatePath(`/app/contract-templates/${t.id}`);
  return t;
}

export async function updateContractTemplate(templateId: string, input: { name?: string; body?: string; isDefault?: boolean }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(contractTemplates)
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Template not found");

  if (input.isDefault) {
    await db.update(contractTemplates)
      .set({ isDefault: false })
      .where(eq(contractTemplates.workspaceId, workspaceId));
  }

  const [updated] = await db.update(contractTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)))
    .returning();
  revalidatePath("/app/templates");
  revalidatePath("/app/contract-templates");
  revalidatePath(`/app/contract-templates/${templateId}`);
  return updated;
}

export async function deleteContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await db.delete(contractTemplates).where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)));
  revalidatePath("/app/templates");
  revalidatePath("/app/contract-templates");
  return { success: true };
}

export async function listContractTemplates() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);
  return db.select().from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId))
    .orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.createdAt));
}

// ─── Contracts ───

const createContractSchema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().trim().min(1).max(200).optional(),
  clientEmail: z.string().email(),
  companyName: z.string().trim().max(200).optional().nullable(),
  contractNumber: z.string().trim().max(100).optional().nullable(),
  contractDate: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().max(50000).default(""),
  contentBlocks: z.unknown().optional(),
  validUntil: z.string().optional().nullable(),
});

export async function createContract(input: z.infer<typeof createContractSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createContractSchema.parse(input);
  let recipient = { name: parsed.clientName?.trim() ?? "", email: parsed.clientEmail, company: parsed.companyName ?? null };
  if (parsed.clientId) {
    const client = await assertClientInWorkspace(db, user.id, parsed.workspaceId, parsed.clientId);
    recipient = { name: client.name, email: client.email ?? parsed.clientEmail, company: client.companyName ?? null };
  }
  if (!recipient.name) throw new Error("Nama client wajib diisi");
  if (parsed.projectId) {
    const project = await assertProjectInWorkspace(db, user.id, parsed.workspaceId, parsed.projectId);
    if (parsed.clientId && project.clientId !== parsed.clientId) throw new ForbiddenError("Project does not belong to client");
  }
  // Re-fetch the template server-side when one is selected: the client list
  // is only used to render the picker. The workspace-scoped row is the source
  // of truth for both the legacy markdown body and the unified contentBlocks,
  // so a tampered client payload can never smuggle foreign-template content
  // into the new contract.
  let templateBlocks: DocumentBlock[] = [];
  let templateBody = "";
  if (parsed.templateId) {
    const [template] = await db.select({ id: contractTemplates.id, body: contractTemplates.body, contentBlocks: contractTemplates.contentBlocks }).from(contractTemplates)
      .where(and(eq(contractTemplates.id, parsed.templateId), eq(contractTemplates.workspaceId, parsed.workspaceId)))
      .limit(1);
    if (!template) throw new ForbiddenError("Contract template access denied");
    templateBlocks = normalizeDocumentBlocks(template.contentBlocks, "contract");
    templateBody = template.body;
  }
  const contentBlocks = templateBlocks.length > 0
    ? templateBlocks
    : normalizeDocumentBlocks(parsed.contentBlocks, "contract");
  // Legacy body fallback: template body is canonical when a template was
  // picked (the dialog has no body editor); otherwise the client body is used.
  const body = parsed.templateId ? (templateBody || parsed.body) : parsed.body;

  // Generate the contract number (and default contract date) inside a
  // transaction. Counter is authoritative, but always bump above
  // MAX(existing CONT-YYYY-####) so seed data / manual inserts cannot collide
  // with the unique index `contracts_workspace_contract_number_unique` (0074).
  let c: typeof contracts.$inferSelect;
  try {
    [c] = await db.transaction(async (tx) => {
    const contractDate = parsed.contractDate || new Date().toISOString().slice(0, 10);
    let contractNumber: string | null = parsed.contractNumber?.trim() || null;
    if (!parsed.contractNumber?.trim()) {
      const [counter] = await tx
        .select({ nextNumber: workspaceInvoiceCounters.nextNumber })
        .from(workspaceInvoiceCounters)
        .where(eq(workspaceInvoiceCounters.workspaceId, parsed.workspaceId))
        .for("update")
        .limit(1);
      const existing = await tx.select({ contractNumber: contracts.contractNumber })
        .from(contracts)
        .where(eq(contracts.workspaceId, parsed.workspaceId));
      const seq = nextDocumentSequence(
        counter?.nextNumber,
        existing.map((row) => row.contractNumber),
        contractNumberSequence,
      );
      contractNumber = buildContractNumber(currentDocumentYear(), seq);
      if (!counter) {
        await tx.insert(workspaceInvoiceCounters).values({ workspaceId: parsed.workspaceId, nextNumber: seq + 1 });
      } else {
        await tx.update(workspaceInvoiceCounters)
          .set({ nextNumber: seq + 1, updatedAt: new Date() })
          .where(eq(workspaceInvoiceCounters.workspaceId, parsed.workspaceId));
      }
    }

    return tx.insert(contracts).values({
      workspaceId: parsed.workspaceId,
      clientId: parsed.clientId,
      clientName: recipient.name,
      clientEmail: recipient.email,
      companyName: recipient.company,
      contractNumber,
      contractDate,
      projectId: parsed.projectId || null,
      templateId: parsed.templateId || null,
      title: parsed.title,
      body,
      contentBlocks,
      bodyResolved: null,
      validUntil: parsed.validUntil || null,
      status: "draft",
      createdBy: user.id,
    }).returning();
    });
  } catch (error) {
    console.error("createContract failed", {
      workspaceId: parsed.workspaceId,
      templateId: parsed.templateId ?? null,
      clientEmail: parsed.clientEmail,
      error,
    });
    throw error;
  }

  await writeActivityLog(parsed.workspaceId, user.id, "created_contract", "contract", c.id, {
    title: c.title,
  });
  revalidatePath("/app/contracts");
  return c;
}

export async function updateContract(contractId: string, input: { clientName?: string; clientEmail?: string | null; companyName?: string | null; title?: string; body?: string; validUntil?: string | null }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Contract not found");
  if (existing.status !== "draft") throw new Error("Can only edit draft contracts");

  const [updated] = await db.update(contracts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();
  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${contractId}`);
  return updated;
}

const blockSaveSchema = z.object({
  contentBlocks: z.unknown(),
  revision: z.number().int().min(1).optional(),
});

/**
 * Save contract editor blocks with stale-write protection. The caller must
 * send the `contentRevision` it loaded (defaults to 1 for legacy clients).
 * The update is a compare-and-swap: it only lands when the stored revision
 * still matches, and atomically bumps the revision on success. A save that
 * raced with another tab/autosave is rejected so the newer content is never
 * silently overwritten.
 */
export async function saveContractBlocks(contractId: string, input: z.infer<typeof blockSaveSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = blockSaveSchema.parse(input);
  const blocks = normalizeDocumentBlocks(parsed.contentBlocks, "contract");
  if (!blocks.some((block) => block.type === "signature")) throw new Error("Signature block wajib ada");
  const expectedRevision = parsed.revision ?? 1;
  const [updated] = await db.update(contracts)
    .set({ contentBlocks: blocks, contentRevision: sql`${contracts.contentRevision} + 1`, updatedAt: new Date() })
    .where(and(
      eq(contracts.id, contractId),
      eq(contracts.workspaceId, workspaceId),
      eq(contracts.status, "draft"),
      eq(contracts.contentRevision, expectedRevision),
    ))
    .returning();
  if (!updated) {
    const [existing] = await db.select({ id: contracts.id, status: contracts.status, contentRevision: contracts.contentRevision })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
      .limit(1);
    if (!existing || existing.status !== "draft") throw new Error("Contract not found or not editable");
    throw new Error("Perubahan sudah kedaluwarsa — dokumen diubah di tab lain. Muat ulang untuk melanjutkan.");
  }
  revalidatePath(`/app/contracts/${contractId}`);
  return updated;
}

export async function deleteContract(contractId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Contract not found");
  if (existing.status === "signed") {
    throw new Error("Kontrak yang sudah ditandatangani tidak bisa dihapus");
  }

  await db.delete(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  await writeActivityLog(workspaceId, user.id, "deleted_contract", "contract", contractId);
  revalidatePath("/app/contracts");
  return { success: true };
}

export async function sendContract(input: {
  contractId: string;
  customMessage?: string;
  ttlDays?: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [c] = await db.select().from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new Error("Contract not found");
  if (c.status !== "draft" && c.status !== "sent" && c.status !== "viewed") {
    throw new Error(`Cannot send contract with status ${c.status}`);
  }

  if (!c.clientEmail) throw new Error("Client email is missing");
  const recipientEmail = c.clientEmail;
  const recipientName = c.clientName;
  const [project] = c.projectId
    ? await db.select().from(projects).where(eq(projects.id, c.projectId)).limit(1)
    : [null];
  const [ws] = await db.select().from(workspaces)
    .where(eq(workspaces.id, workspaceId)).limit(1);

  const vars = buildContractPlaceholderValues({
    clientName: c.clientName,
    clientEmail: c.clientEmail,
    companyName: c.companyName,
    contractNumber: c.contractNumber,
    contractDate: c.contractDate,
    validUntil: c.validUntil,
    workspaceName: ws?.name || "Cubiqlo",
    workspaceAddress: ws?.billingAddress,
  });
  const legacyVars: Record<string, string> = {
    "client.name": String(vars.client_name ?? ""),
    "client.email": String(vars.client_email ?? ""),
    "company.name": String(vars.company_name ?? ""),
    "project.name": project?.name || "",
    "workspace.name": String(vars.workspace_name ?? ""),
    "workspace.address": String(vars.workspace_address ?? ""),
    "contract.number": String(vars.contract_number ?? ""),
    "contract.date": String(vars.contract_date ?? ""),
    today: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    valid_until: String(vars.valid_until ?? ""),
  };
  const bodyResolved = resolveTemplate(resolveDocumentPlaceholders(c.body || "", vars), legacyVars);

  const token = generateToken();
  const ttl = input.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  // Transactional send: lock the row, guard the status transition, and only
  // commit the sent status + rotated token AFTER the client email succeeded.
  // If the email fails, throw so the transaction rolls back — the contract
  // stays in its previous status and the previous link stays valid (no
  // duplicate-send / lost-link / "sent but never emailed" states).
  const [updated] = await db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: contracts.id, status: contracts.status })
      .from(contracts)
      .where(eq(contracts.id, input.contractId))
      .for("update")
      .limit(1);
    if (!locked) throw new Error("Contract not found");
    if (locked.status !== "draft" && locked.status !== "sent" && locked.status !== "viewed") {
      throw new Error(`Cannot send contract with status ${locked.status}`);
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "https://cubiqlo.com"
    ).replace(/\/$/, "");
    const replyTo = await resolveWorkspaceReplyTo(workspaceId);
    const contractUrl = `${appUrl}/contract/${token}`;
    const text = (
      input.customMessage?.trim() ||
      `Hi ${recipientName || "there"},\n\n` +
        `${ws?.name || "Cubiqlo"} sent you a contract for signature: "${c.title}".\n\n` +
        `Review and sign it here:\n{{contract_link}}\n\n` +
        (vars.valid_until ? `This link is valid until ${vars.valid_until}.\n\n` : "\n") +
        `If you have any questions, just reply to this email.`
    ).replace(/\{\{contract_link\}\}/g, contractUrl);
    const emailResult = await sendNotification({
      to: recipientEmail,
      subject: `Contract for signature: ${c.title}`,
      text,
      type: "contract_sent",
      replyTo,
    });
    if (!emailResult.success) {
      throw new Error("Failed to send contract email — contract was not marked as sent");
    }

    return tx.update(contracts)
      .set({
        bodyResolved,
        variables: { ...legacyVars, ...vars },
        sharedTokenHash: hashToken(token),
        sharedTokenExpiresAt: expiresAt,
        sentAt: new Date(),
        status: "sent",
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, c.id))
      .returning();
  });

  await writeActivityLog(workspaceId, user.id, "sent_contract", "contract", c.id, {
    title: c.title,
    clientName: recipientName,
  });

  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${c.id}`);
  return { contract: updated, token };
}

export async function createClientFromSignedContract(contractId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const [contract] = await db.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId), eq(contracts.status, "signed")))
    .limit(1);
  if (!contract) throw new Error("Signed contract not found");
  if (contract.clientId) return { clientId: contract.clientId, created: false };
  const created = await createClient({
    name: contract.clientName,
    email: contract.clientEmail ?? "",
    companyName: contract.companyName ?? "",
    tags: [],
  });
  if (!created.ok) throw new Error(created.error);
  await db.update(contracts).set({ clientId: created.client.id, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  await writeActivityLog(workspaceId, user.id, "created_client_from_contract", "contract", contractId, { clientId: created.client.id });
  revalidatePath(`/app/contracts/${contractId}`);
  revalidatePath("/app/clients");
  return { clientId: created.client.id, created: true };
}

export async function revokeContract(contractId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [updated] = await db.update(contracts)
    .set({ status: "revoked", sharedTokenRevokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .returning();
  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${contractId}`);
  return updated;
}

export async function listContracts(filter?: { status?: string; clientId?: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const conditions = [eq(contracts.workspaceId, workspaceId)];
  if (filter?.status) {
    conditions.push(eq(contracts.status, filter.status as "draft" | "sent" | "viewed" | "signed" | "declined" | "expired" | "revoked"));
  }
  if (filter?.clientId) conditions.push(eq(contracts.clientId, filter.clientId));

  return db.select({
    id: contracts.id,
    title: contracts.title,
    status: contracts.status,
    validUntil: contracts.validUntil,
    sentAt: contracts.sentAt,
    viewedAt: contracts.viewedAt,
    signedAt: contracts.signedAt,
    declinedAt: contracts.declinedAt,
    createdAt: contracts.createdAt,
    clientId: contracts.clientId,
    clientName: contracts.clientName,
  })
    .from(contracts)
    .leftJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(...conditions))
    .orderBy(desc(contracts.createdAt))
    .limit(100);
}

export async function getContract(contractId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [c] = await db.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new Error("Contract not found");

  const [client] = c.clientId ? await db.select().from(clients).where(eq(clients.id, c.clientId)).limit(1) : [null];
  const [project] = c.projectId
    ? await db.select().from(projects).where(eq(projects.id, c.projectId)).limit(1)
    : [null];

  return { ...c, client, project };
}

// ─── Public: View, Sign, Decline ───

export async function getPublicContract(token: string) {
  const tokenHash = hashToken(token);
  const [c] = await db.select().from(contracts)
    .where(eq(contracts.sharedTokenHash, tokenHash))
    .limit(1);
  if (!c) return { error: "not_found" as const };
  if (c.sharedTokenRevokedAt) return { error: "revoked" as const };
  if (c.sharedTokenExpiresAt && c.sharedTokenExpiresAt < new Date()) {
    return { error: "expired" as const };
  }
  if (c.status === "signed") return { error: "already_signed" as const };
  if (c.status === "declined") return { error: "declined" as const };
  if (c.status === "draft") return { error: "not_sent" as const };

  const [client] = c.clientId ? await db.select({ name: clients.name, email: clients.email })
    .from(clients).where(eq(clients.id, c.clientId)).limit(1) : [null];
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress })
    .from(workspaces).where(eq(workspaces.id, c.workspaceId)).limit(1);

  // Mark as viewed (idempotent) + notify workspace on first view
  if (!c.viewedAt && c.status === "sent") {
    await db.update(contracts)
      .set({ viewedAt: new Date(), status: "viewed", updatedAt: new Date() })
      .where(eq(contracts.id, c.id));

    try {
      await notifyWorkspaceMembers(c.workspaceId, {
        type: "contract_viewed",
        title: `${client?.name ?? c.clientName ?? "Client"} viewed contract`,
        body: c.title,
        link: `/app/contracts/${c.id}`,
        entityType: "contract",
        entityId: c.id,
        actorId: null,
      });
    } catch {
      // best-effort
    }
  }

  return {
    contract: { ...c, bodyResolved: c.bodyResolved, variables: c.variables },
    client: client ?? { name: c.clientName, email: c.clientEmail },
    workspace,
  };
}

export async function signContract(input: {
  token: string;
  signedName: string;
  signedEmail: string;
  signatureDataUrl: string;
}) {
  if (!input.signedName.trim()) throw new Error("Name is required");
  if (!input.signedEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.signedEmail)) {
    throw new Error("Valid email is required");
  }
  const signatureValidation = validateSignatureDataUrl(input.signatureDataUrl);
  if (!signatureValidation.ok) throw new Error(signatureValidation.reason);

  const tokenHash = hashToken(input.token);
  await enforceServerActionRateLimit("contract:sign", tokenHash, { limit: 10, windowSec: 300 });

  // Capture IP + UA from headers (server action receives request context)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ua = h.get("user-agent") || "unknown";

  // Atomic sign: lock the row, re-check the token lifecycle + already-signed
  // guard under the lock, then commit the signature. Two concurrent submits
  // can't both pass the "signed" check — the second transaction blocks on the
  // row lock and re-reads status "signed" before writing (mirrors
  // acceptProposalPublic).
  const [updated] = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(contracts)
      .where(eq(contracts.sharedTokenHash, tokenHash))
      .for("update")
      .limit(1);
    if (!locked) throw new Error("Contract not found");
    try {
      assertPublicTokenLifecycle({
        presentedHash: tokenHash,
        storedHash: locked.sharedTokenHash,
        revokedAt: locked.sharedTokenRevokedAt,
        expiresAt: locked.sharedTokenExpiresAt,
        status: locked.status,
        allowedStatuses: ["sent", "viewed", "signed"],
        processedStatuses: ["declined"],
      });
    } catch (error) {
      if (error instanceof PublicTokenError) {
        const messages = {
          invalid: "Contract not found",
          disabled: "Contract disabled",
          revoked: "Contract revoked",
          expired: "Contract expired",
          processed: "Contract was declined",
          unavailable: "Contract was not sent",
        } as const;
        throw new Error(messages[error.code]);
      }
      throw error;
    }
    if (locked.status === "signed") throw new Error("Contract already signed");

    return tx.update(contracts)
      .set({
        status: "signed",
        signedName: input.signedName.trim(),
        signedEmail: input.signedEmail.trim().toLowerCase(),
        signatureDataUrl: input.signatureDataUrl,
        signedAt: new Date(),
        signedFromIp: ip,
        signedUserAgent: ua,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, locked.id))
      .returning();
  });

  try {
    await writeActivityLog(updated.workspaceId, null, "signed_contract", "contract", updated.id, {
      title: updated.title,
      signedName: input.signedName,
      signedEmail: input.signedEmail,
      signedFromIp: ip,
    });
  } catch {
    // best-effort: the signature is already committed — an audit-log failure
    // must never surface as a false "sign failed" error to the signer.
  }

  try {
    await notifyWorkspaceMembers(updated.workspaceId, {
      type: "contract_signed",
      title: `${input.signedName.trim()} signed contract`,
      body: updated.title,
      link: `/app/contracts/${updated.id}`,
      entityType: "contract",
      entityId: updated.id,
      actorId: null,
    });
  } catch {
    // best-effort
  }

  return updated;
}

export async function declineContract(input: { token: string; reason?: string }) {
  const tokenHash = hashToken(input.token);
  await enforceServerActionRateLimit("contract:decline", tokenHash, { limit: 10, windowSec: 300 });
  const [c] = await db.select().from(contracts)
    .where(eq(contracts.sharedTokenHash, tokenHash))
    .limit(1);
  if (!c) throw new Error("Contract not found");
  if (c.status === "declined") throw new Error("Contract already declined");
  try {
    assertPublicTokenLifecycle({
      presentedHash: tokenHash,
      storedHash: c.sharedTokenHash,
      revokedAt: c.sharedTokenRevokedAt,
      expiresAt: c.sharedTokenExpiresAt,
      status: c.status,
      allowedStatuses: ["sent", "viewed"],
      processedStatuses: ["signed"],
    });
  } catch (error) {
    if (error instanceof PublicTokenError) {
      const messages = {
        invalid: "Contract not found",
        disabled: "Contract disabled",
        revoked: "Contract revoked",
        expired: "Contract expired",
        processed: "Contract already signed",
        unavailable: "Contract was not sent",
      } as const;
      throw new Error(messages[error.code]);
    }
    throw error;
  }

  const [updated] = await db.update(contracts)
    .set({
      status: "declined",
      declineReason: input.reason || null,
      declinedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, c.id))
    .returning();

  await writeActivityLog(c.workspaceId, c.signedEmail || "anonymous", "declined_contract", "contract", c.id, {
    title: c.title,
    reason: input.reason,
  });

  return updated;
}
