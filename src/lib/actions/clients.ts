"use server";
import { redirect } from "next/navigation";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { createHash, randomBytes } from "crypto";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
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
});

// ─── CRUD Actions ───

async function assertCanCreateClient(workspaceId: string, userId: string) {
  await assertWorkspaceWritable(db, userId, workspaceId);

  // Check plan limits
  const { getWorkspacePlan, checkEntityLimit } = await import("@/lib/plan");
  const plan = await getWorkspacePlan(workspaceId);
  const clientLimit = await checkEntityLimit(workspaceId, "clients", plan);
  if (!clientLimit.allowed) {
    throw new Error(clientLimit.reason!);
  }
}

async function insertClient(workspaceId: string, userId: string, input: z.infer<typeof clientSchema>) {
  const parsed = clientSchema.parse(input);

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
    portalSlugEnabled: parsed.portalSlugEnabled ?? true,
    status: "active",
  }).returning();

  await writeActivityLog(workspaceId, userId, "created_client", "client", client.id);
  return client;
}

export async function createClient(input: z.infer<typeof clientSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertCanCreateClient(workspaceId, user.id);
  return insertClient(workspaceId, user.id, input);
}

export async function createClientFromForm(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertCanCreateClient(workspaceId, user.id);

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

  const [client] = await db.update(clients)
    .set(updateData)
    .where(eq(clients.id, clientId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_client", "client", clientId);
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

// ─── Portal Token ───

export async function generatePortalToken(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90); // 90 days

  await db.update(clients)
    .set({
      portalEnabled: true,
      portalTokenHash: tokenHash,
      portalTokenExpiresAt: expiresAt,
      portalTokenRevokedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  await writeActivityLog(workspaceId, user.id, "generated_portal_token", "client", clientId);
  return { token: rawToken, expiresAt };
}

export async function revokePortalToken(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  await db.update(clients)
    .set({
      portalTokenRevokedAt: new Date(),
      portalEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  await writeActivityLog(workspaceId, user.id, "revoked_portal_token", "client", clientId);
  return { success: true };
}
