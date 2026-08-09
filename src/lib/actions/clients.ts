"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, workspaceMembers } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { createHash, randomBytes } from "crypto";
import { hashPassword } from "@better-auth/utils/password";
import { encryptSecret } from "@/lib/google-calendar";
import { decryptPortalPassword, encryptPortalPassword } from "@/lib/portal-password-encryption";

import { getCurrentLang, createT } from "@/lib/i18n";

async function getT() {
  const lang = await getCurrentLang();
  return createT(lang);
}

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

/** Next workspace client number: CLI-000001 */
async function nextClientNumber(workspaceId: string): Promise<string> {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(
      CASE
        WHEN client_number ~ '^CLI-[0-9]+$'
        THEN CAST(substring(client_number from 5) AS integer)
        ELSE 0
      END
    ), 0)::int AS max_num
    FROM clients
    WHERE workspace_id = ${workspaceId}
  `);
  const maxNum = Number((result.rows[0] as { max_num?: number } | undefined)?.max_num ?? 0);
  return `CLI-${String(maxNum + 1).padStart(6, "0")}`;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only")
  .min(3)
  .max(60);

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  tags: z.array(z.string()).default([]),
  internalNotes: z.string().optional(),
  portalSlug: slugSchema.optional().or(z.literal("")),
  portalSlugEnabled: z.boolean().optional(),
  /** When true on create: generate portal token + set portalEnabled */
  portalEnabled: z.boolean().optional(),
});
const clientStatusSchema = z.enum(["active", "inactive", "archived"]);

// ─── CRUD Actions ───

async function assertCanCreateClient(workspaceId: string, userId: string) {
  await assertWorkspaceWritable(db, userId, workspaceId);

  // Check plan limits (plan is per-user, not per-workspace)
  const { getUserPlan, checkEntityLimit } = await import("@/lib/plan");
  const plan = await getUserPlan(userId);
  const clientLimit = await checkEntityLimit(workspaceId, "clients", plan);
  if (!clientLimit.allowed) {
    return {
      ok: false as const,
      code: "PLAN_LIMIT" as const,
      error: clientLimit.reason ?? "Plan limit reached",
      current: clientLimit.current,
      limit: clientLimit.limit,
    };
  }
  return { ok: true as const };
}

async function assertCanUseClientPortal(userId: string) {
  const { getUserPlan, getPlanLimits } = await import("@/lib/plan");
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  if (!limits.hasClientPortal) {
    throw new Error("Client portal tidak tersedia di plan ini.");
  }
}

async function insertClient(workspaceId: string, userId: string, input: z.infer<typeof clientSchema>) {
  const parsed = clientSchema.parse(input);

  // Optionally activate portal on create (token + enabled flag).
  let portalFields: {
    portalEnabled?: boolean;
    portalTokenHash?: string;
    portalTokenEnc?: string;
    portalTokenExpiresAt?: Date;
    portalTokenRevokedAt?: null;
  } = {};
  let rawPortalToken: string | null = null;
  if (parsed.portalEnabled) {
    await assertCanUseClientPortal(userId);
    rawPortalToken = randomBytes(32).toString("hex");
    portalFields = {
      portalEnabled: true,
      portalTokenHash: createHash("sha256").update(rawPortalToken).digest("hex"),
      portalTokenEnc: encryptSecret(rawPortalToken),
      portalTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      portalTokenRevokedAt: null,
    };
  }

  const clientNumber = await nextClientNumber(workspaceId);

  try {
    const [client] = await db.insert(clients).values({
      workspaceId,
      name: parsed.name,
      companyName: parsed.companyName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      website: parsed.website || null,
      address: parsed.address || null,
      tags: parsed.tags,
      internalNotes: parsed.internalNotes || null,
      portalSlug: parsed.portalSlug || null,
      // Persist the caller-provided flag (e.g. form sets it from a filled slug).
      // A slug is required for the portal slug to be usable, so an empty slug
      // always stays disabled — even if the flag was sent as true.
      portalSlugEnabled: parsed.portalSlug ? Boolean(parsed.portalSlugEnabled) : false,
      clientNumber,
      status: "active",
      ...portalFields,
    }).returning();

    await writeActivityLog(workspaceId, userId, "created_client", "client", client.id);
    if (rawPortalToken) {
      await writeActivityLog(workspaceId, userId, "generated_portal_token", "client", client.id);
    }
    return client;
  } catch (err: unknown) {
    const t = await getT();
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      const detail = "detail" in err ? String(err.detail) : "";
      if (detail.includes("portal_slug") || ("constraint" in err && err.constraint === "clients_portal_slug_unique")) {
        throw new Error(t("Slug URL portal sudah digunakan oleh klien lain. Silakan ubah URL portal.", "Portal URL slug is already in use by another client. Please change the portal URL."));
      }
    }
    throw err;
  }
}

export async function createClient(input: z.infer<typeof clientSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const gate = await assertCanCreateClient(workspaceId, user.id);
  if (!gate.ok) return gate;
  try {
    const client = await insertClient(workspaceId, user.id, input);
    revalidatePath("/app/clients");
    return { ok: true as const, client };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Gagal membuat klien",
    };
  }
}

export async function createClientFromForm(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const gate = await assertCanCreateClient(workspaceId, user.id);
  if (!gate.ok) {
    // Form path still needs hard fail for redirect flow
    throw new Error(gate.error);
  }

  await insertClient(workspaceId, user.id, {
    name: String(formData.get("name") ?? ""),
    companyName: String(formData.get("companyName") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    website: String(formData.get("website") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    internalNotes: String(formData.get("internalNotes") ?? "") || undefined,
    portalSlug: String(formData.get("portalSlug") ?? "") || undefined,
    portalSlugEnabled: formData.get("portalSlugEnabled") === "on",
    portalEnabled: formData.get("portalEnabled") === "on",
  });

  redirect("/app/clients");
}

export async function updateClient(clientId: string, input: Partial<z.infer<typeof clientSchema>> & { status?: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);

  const parsed = clientSchema.partial().parse(input);

  if (parsed.portalEnabled || parsed.portalSlugEnabled) {
    await assertCanUseClientPortal(user.id);
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.companyName !== undefined) updateData.companyName = parsed.companyName;
  if (parsed.email !== undefined) updateData.email = parsed.email;
  if (parsed.phone !== undefined) updateData.phone = parsed.phone;
  if (parsed.website !== undefined) updateData.website = parsed.website;
  if (parsed.address !== undefined) updateData.address = parsed.address;
  if (parsed.tags !== undefined) updateData.tags = parsed.tags;
  if (parsed.internalNotes !== undefined) updateData.internalNotes = parsed.internalNotes;
  if (parsed.portalSlug !== undefined) updateData.portalSlug = parsed.portalSlug || null;
  if (parsed.portalSlugEnabled !== undefined) updateData.portalSlugEnabled = parsed.portalSlugEnabled;
  if (input.status !== undefined) updateData.status = input.status;
  updateData.updatedAt = new Date();

  try {
    const [client] = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();

    await writeActivityLog(workspaceId, user.id, "updated_client", "client", clientId);
    return client;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      const detail = "detail" in err ? String(err.detail) : "";
      if (detail.includes("portal_slug") || ("constraint" in err && err.constraint === "clients_portal_slug_unique")) {
        throw new Error("Slug URL portal sudah digunakan oleh klien lain. Silakan ubah URL portal.");
      }
    }
    throw err;
  }
}

export async function updateClientStatus(clientId: string, status: z.infer<typeof clientStatusSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  const parsed = clientStatusSchema.parse(status);
  const [client] = await db.update(clients)
    .set({ status: parsed, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .returning();
  revalidatePath("/app/clients");
  return client;
}

export async function archiveClient(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);

  const [client] = await db.update(clients)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "archived_client", "client", clientId);
  return client;
}

export async function permanentlyDeleteClient(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM time_entries WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM custom_package_requests WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM package_orders WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM retainer_periods WHERE workspace_id=${workspaceId} AND project_id IN (SELECT id FROM projects WHERE workspace_id=${workspaceId} AND client_id=${clientId})`);
    await tx.execute(sql`DELETE FROM appointments WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM expenses WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM prompt_generations WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM portal_access_logs WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM questionnaire_responses WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM email_messages WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    await tx.execute(sql`DELETE FROM support_tickets WHERE workspace_id=${workspaceId} AND client_id=${clientId}`);
    const deleted = await tx.execute(sql`DELETE FROM clients WHERE workspace_id=${workspaceId} AND id=${clientId} RETURNING id`);
    if (deleted.rows.length === 0) throw new Error("Klien tidak ditemukan");
    return { success: true };
  });
}

// ─── Portal Token ───

export async function generatePortalToken(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  await assertCanUseClientPortal(user.id);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90); // 90 days

  await db.update(clients)
    .set({
      portalEnabled: true,
      portalTokenHash: tokenHash,
      portalTokenEnc: encryptSecret(rawToken),
      portalTokenExpiresAt: expiresAt,
      portalTokenRevokedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));

  await writeActivityLog(workspaceId, user.id, "generated_portal_token", "client", clientId);
  return { token: rawToken, expiresAt };
}

export async function revokePortalToken(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);

  await db.update(clients)
    .set({
      portalTokenRevokedAt: new Date(),
      portalTokenEnc: null,
      portalEnabled: false,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));

  await writeActivityLog(workspaceId, user.id, "revoked_portal_token", "client", clientId);
  return { success: true };
}

export async function setClientPortalPassword(clientId: string, password: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  await assertCanUseClientPortal(user.id);
  const value = z.string().min(8, "Password minimal 8 karakter").max(128).parse(password);
  const [current] = await db.select({ slug: clients.portalSlug }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));
  const slug = current?.slug || `client-${clientId.slice(0, 8)}`;
  const key = process.env.PORTAL_PASSWORD_ENCRYPTION_KEY;
  if (!key) throw new Error("PORTAL_PASSWORD_ENCRYPTION_KEY belum dikonfigurasi");
  const encrypted = encryptPortalPassword(value, key);
  const passwordHash = await hashPassword(value);
  await db.transaction(async (tx) => {
    await tx.update(clients).set({
      portalSlug: slug,
      portalSlugEnabled: true,
      portalEnabled: true,
      portalPasswordHash: passwordHash,
      portalPasswordCiphertext: encrypted.ciphertext,
      portalPasswordNonce: encrypted.nonce,
      portalPasswordEncryptionVersion: encrypted.version,
      portalPasswordEncryptedAt: new Date(),
      portalSessionVersion: randomBytes(16).toString("hex"),
      updatedAt: new Date(),
    }).where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));
  });
  await writeActivityLog(workspaceId, user.id, "updated_portal_password", "client", clientId);
  return { success: true, slug };
}

export async function revealClientPortalPassword(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  const [member] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id))).limit(1);
  if (!member || member.role !== "owner") throw new Error("Hanya owner dapat melihat password Portal");
  const [client] = await db.select({ ciphertext: clients.portalPasswordCiphertext, nonce: clients.portalPasswordNonce, version: clients.portalPasswordEncryptionVersion }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId))).limit(1);
  if (!client?.ciphertext || !client.nonce || !client.version) return { state: "unrecoverable" as const };
  const key = process.env.PORTAL_PASSWORD_ENCRYPTION_KEY;
  if (!key) throw new Error("PORTAL_PASSWORD_ENCRYPTION_KEY belum dikonfigurasi");
  const password = decryptPortalPassword({ ciphertext: client.ciphertext, nonce: client.nonce, version: client.version }, key);
  await writeActivityLog(workspaceId, user.id, "revealed_portal_password", "client", clientId);
  return { state: "revealed" as const, password };
}
