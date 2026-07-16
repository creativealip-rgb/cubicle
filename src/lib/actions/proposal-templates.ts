"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { proposalTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  body: z.string().max(20000).optional().nullable(),
  defaultCurrency: z.string().min(3).max(3).default("IDR"),
  defaultTaxRate: z.string().default("0"),
  defaultDownPaymentPercent: z.string().default("50"),
  lineItems: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function revalidateTemplates() {
  revalidatePath("/app/templates");
  revalidatePath("/app/proposals");
  revalidatePath("/app/proposals/new");
}

export async function createProposalTemplate(
  input: z.infer<typeof templateSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa membuat template");

  const parsed = templateSchema.parse(input);

  if (parsed.isDefault) {
    await db
      .update(proposalTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(proposalTemplates.workspaceId, workspaceId));
  }

  const [template] = await db
    .insert(proposalTemplates)
    .values({
      workspaceId,
      name: parsed.name,
      body: parsed.body?.trim() || null,
      defaultCurrency: parsed.defaultCurrency || "IDR",
      defaultTaxRate: parsed.defaultTaxRate || "0",
      defaultDownPaymentPercent: parsed.defaultDownPaymentPercent || "50",
      lineItems: parsed.lineItems || null,
      isDefault: parsed.isDefault,
      createdBy: user.id,
    })
    .returning();

  revalidateTemplates();
  return template;
}

export async function updateProposalTemplate(
  templateId: string,
  input: z.infer<typeof templateSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa mengubah template");

  const parsed = templateSchema.parse(input);

  const [existing] = await db
    .select({ id: proposalTemplates.id })
    .from(proposalTemplates)
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  if (parsed.isDefault) {
    await db
      .update(proposalTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(proposalTemplates.workspaceId, workspaceId));
  }

  const [template] = await db
    .update(proposalTemplates)
    .set({
      name: parsed.name,
      body: parsed.body?.trim() || null,
      defaultCurrency: parsed.defaultCurrency || "IDR",
      defaultTaxRate: parsed.defaultTaxRate || "0",
      defaultDownPaymentPercent: parsed.defaultDownPaymentPercent || "50",
      lineItems: parsed.lineItems || null,
      isDefault: parsed.isDefault,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidateTemplates();
  return template;
}

export async function deleteProposalTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa menghapus template");

  await db
    .delete(proposalTemplates)
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    );

  revalidateTemplates();
}

export async function setDefaultProposalTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa mengubah template");

  const [existing] = await db
    .select({ id: proposalTemplates.id })
    .from(proposalTemplates)
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  await db
    .update(proposalTemplates)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(proposalTemplates.workspaceId, workspaceId));

  const [tpl] = await db
    .update(proposalTemplates)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidateTemplates();
  return tpl;
}

export async function duplicateProposalTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewer tidak bisa membuat template");

  const [existing] = await db
    .select()
    .from(proposalTemplates)
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  const [template] = await db
    .insert(proposalTemplates)
    .values({
      workspaceId,
      name: `${existing.name} (salinan)`,
      body: existing.body,
      defaultCurrency: existing.defaultCurrency,
      defaultTaxRate: existing.defaultTaxRate,
      defaultDownPaymentPercent: existing.defaultDownPaymentPercent,
      lineItems: existing.lineItems,
      isDefault: false,
      createdBy: user.id,
    })
    .returning();

  revalidateTemplates();
  return template;
}

export async function listProposalTemplates() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  return db
    .select({
      id: proposalTemplates.id,
      name: proposalTemplates.name,
      body: proposalTemplates.body,
      defaultCurrency: proposalTemplates.defaultCurrency,
      defaultTaxRate: proposalTemplates.defaultTaxRate,
      defaultDownPaymentPercent: proposalTemplates.defaultDownPaymentPercent,
      lineItems: proposalTemplates.lineItems,
      isDefault: proposalTemplates.isDefault,
      createdAt: proposalTemplates.createdAt,
      updatedAt: proposalTemplates.updatedAt,
    })
    .from(proposalTemplates)
    .where(eq(proposalTemplates.workspaceId, workspaceId))
    .orderBy(desc(proposalTemplates.isDefault), desc(proposalTemplates.updatedAt))
    .limit(100);
}
