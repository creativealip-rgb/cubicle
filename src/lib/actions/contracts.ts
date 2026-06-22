"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { contracts, contractTemplates, clients, projects, workspaces } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
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
    .where(eq(contractTemplates.id, templateId))
    .returning();
  return updated;
}

export async function deleteContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await db.delete(contractTemplates).where(eq(contractTemplates.id, templateId));
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
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  validUntil: z.string().optional().nullable(),
});

export async function createContract(input: z.infer<typeof createContractSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createContractSchema.parse(input);

  const [c] = await db.insert(contracts).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId,
    projectId: parsed.projectId || null,
    templateId: parsed.templateId || null,
    title: parsed.title,
    body: parsed.body,
    bodyResolved: null,
    validUntil: parsed.validUntil || null,
    status: "draft",
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_contract", "contract", c.id, {
    title: c.title,
  });
  return c;
}

export async function updateContract(contractId: string, input: { title?: string; body?: string; validUntil?: string | null }) {
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
  return updated;
}

export async function deleteContract(contractId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await db.delete(contracts).where(eq(contracts.id, contractId));
  return { success: true };
}

export async function sendContract(input: {
  contractId: string;
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

  const [client] = await db.select().from(clients)
    .where(eq(clients.id, c.clientId))
    .limit(1);
  const [project] = c.projectId
    ? await db.select().from(projects).where(eq(projects.id, c.projectId)).limit(1)
    : [null];
  const [ws] = await db.select().from(workspaces)
    .where(eq(workspaces.id, workspaceId)).limit(1);

  const vars: Record<string, string> = {
    "client.name": client?.name || "",
    "client.email": client?.email || "",
    "project.name": project?.name || "",
    "workspace.name": ws?.name || "Cubiqlo",
    "today": new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    "valid_until": c.validUntil ? new Date(c.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "",
  };
  const bodyResolved = resolveTemplate(c.body || "", vars);

  const token = generateToken();
  const ttl = input.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  const [updated] = await db.update(contracts)
    .set({
      bodyResolved,
      variables: vars,
      sharedTokenHash: hashToken(token),
      sharedTokenExpiresAt: expiresAt,
      sentAt: new Date(),
      status: "sent",
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, c.id))
    .returning();

  await writeActivityLog(workspaceId, user.id, "sent_contract", "contract", c.id, {
    title: c.title,
    clientName: client?.name,
  });

  return { contract: updated, token };
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
    clientName: clients.name,
  })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
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

  const [client] = await db.select().from(clients).where(eq(clients.id, c.clientId)).limit(1);
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

  const [client] = await db.select({ name: clients.name, email: clients.email })
    .from(clients).where(eq(clients.id, c.clientId)).limit(1);

  // Mark as viewed (idempotent) + notify workspace on first view
  if (!c.viewedAt && c.status === "sent") {
    await db.update(contracts)
      .set({ viewedAt: new Date(), status: "viewed", updatedAt: new Date() })
      .where(eq(contracts.id, c.id));

    try {
      await notifyWorkspaceMembers(c.workspaceId, {
        type: "contract_viewed",
        title: `${client?.name ?? "Client"} viewed contract`,
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
    client,
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
  if (!input.signatureDataUrl || !input.signatureDataUrl.startsWith("data:image/")) {
    throw new Error("Signature is required");
  }

  const tokenHash = hashToken(input.token);
  const [c] = await db.select().from(contracts)
    .where(eq(contracts.sharedTokenHash, tokenHash))
    .limit(1);
  if (!c) throw new Error("Contract not found");
  if (c.sharedTokenRevokedAt) throw new Error("Contract revoked");
  if (c.sharedTokenExpiresAt && c.sharedTokenExpiresAt < new Date()) {
    throw new Error("Contract expired");
  }
  if (c.status === "signed") throw new Error("Contract already signed");
  if (c.status === "declined") throw new Error("Contract was declined");
  if (c.status === "draft") throw new Error("Contract was not sent");

  // Capture IP + UA from headers (server action receives request context)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ua = h.get("user-agent") || "unknown";

  const [updated] = await db.update(contracts)
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
    .where(eq(contracts.id, c.id))
    .returning();

  await writeActivityLog(c.workspaceId, input.signedEmail, "signed_contract", "contract", c.id, {
    title: c.title,
    signedName: input.signedName,
    signedFromIp: ip,
  });

  try {
    await notifyWorkspaceMembers(c.workspaceId, {
      type: "contract_signed",
      title: `${input.signedName.trim()} signed contract`,
      body: c.title,
      link: `/app/contracts/${c.id}`,
      entityType: "contract",
      entityId: c.id,
      actorId: null,
    });
  } catch {
    // best-effort
  }

  return updated;
}

export async function declineContract(input: { token: string; reason?: string }) {
  const tokenHash = hashToken(input.token);
  const [c] = await db.select().from(contracts)
    .where(eq(contracts.sharedTokenHash, tokenHash))
    .limit(1);
  if (!c) throw new Error("Contract not found");
  if (c.sharedTokenRevokedAt) throw new Error("Contract revoked");
  if (c.status === "signed") throw new Error("Contract already signed");
  if (c.status === "declined") throw new Error("Contract already declined");

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
