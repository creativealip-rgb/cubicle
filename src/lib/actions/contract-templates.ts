"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { contractTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  body: z.string().min(1).max(50000).optional(),
  isDefault: z.boolean().default(false),
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function revalidateTemplates(templateId?: string) {
  revalidatePath("/app/templates");
  revalidatePath("/app/contract-templates");
  if (templateId) revalidatePath(`/app/contract-templates/${templateId}`);
}

export async function createContractTemplate(input: z.infer<typeof schema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa membuat template");

  const parsed = schema.parse(input);
  if (!parsed.body?.trim()) throw new Error("Isi kontrak wajib diisi");

  if (parsed.isDefault) {
    await db
      .update(contractTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(contractTemplates.workspaceId, workspaceId));
  }

  const [tpl] = await db
    .insert(contractTemplates)
    .values({
      workspaceId,
      name: parsed.name,
      body: parsed.body.trim(),
      isDefault: parsed.isDefault,
      createdBy: user.id,
    })
    .returning();

  revalidateTemplates(tpl.id);
  return tpl;
}

export async function updateContractTemplate(
  templateId: string,
  input: z.infer<typeof schema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa mengubah template");

  const parsed = schema.parse(input);
  if (!parsed.body?.trim()) throw new Error("Isi kontrak wajib diisi");

  const [existing] = await db
    .select()
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  if (parsed.isDefault) {
    await db
      .update(contractTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(contractTemplates.workspaceId, workspaceId));
  }

  const [tpl] = await db
    .update(contractTemplates)
    .set({
      name: parsed.name,
      body: parsed.body.trim(),
      isDefault: parsed.isDefault,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidateTemplates(templateId);
  return tpl;
}

export async function deleteContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa menghapus template");

  await db
    .delete(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    );

  revalidateTemplates();
}

export async function setDefaultContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa mengubah template");

  const [existing] = await db
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  await db
    .update(contractTemplates)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(contractTemplates.workspaceId, workspaceId));

  const [tpl] = await db
    .update(contractTemplates)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidateTemplates(templateId);
  return tpl;
}

export async function duplicateContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa membuat template");

  const [existing] = await db
    .select()
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  const [tpl] = await db
    .insert(contractTemplates)
    .values({
      workspaceId,
      name: `${existing.name} (salinan)`,
      body: existing.body,
      isDefault: false,
      createdBy: user.id,
    })
    .returning();

  revalidateTemplates(tpl.id);
  return tpl;
}

export async function listContractTemplates() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  return db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId))
    .orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.updatedAt))
    .limit(100);
}
