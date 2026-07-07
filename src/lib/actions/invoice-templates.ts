"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { invoiceTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  terms: z.string().optional(),
  notes: z.string().optional(),
  defaultCurrency: z.string().default("IDR"),
  defaultTaxRate: z.string().default("0"),
  lineItems: z.string().optional(), // JSON string
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export async function createInvoiceTemplate(input: z.infer<typeof templateSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot create templates");

  const parsed = templateSchema.parse(input);

  const [template] = await db
    .insert(invoiceTemplates)
    .values({
      workspaceId,
      name: parsed.name,
      terms: parsed.terms || null,
      notes: parsed.notes || null,
      defaultCurrency: parsed.defaultCurrency,
      defaultTaxRate: parsed.defaultTaxRate,
      lineItems: parsed.lineItems || null,
      createdBy: user.id,
    })
    .returning();

  return template;
}

export async function updateInvoiceTemplate(templateId: string, input: z.infer<typeof templateSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot update templates");

  const parsed = templateSchema.parse(input);

  const [template] = await db
    .update(invoiceTemplates)
    .set({
      name: parsed.name,
      terms: parsed.terms || null,
      notes: parsed.notes || null,
      defaultCurrency: parsed.defaultCurrency,
      defaultTaxRate: parsed.defaultTaxRate,
      lineItems: parsed.lineItems || null,
      updatedAt: new Date(),
    })
    .where(and(eq(invoiceTemplates.id, templateId), eq(invoiceTemplates.workspaceId, workspaceId)))
    .returning();

  return template;
}

export async function deleteInvoiceTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();

  await db
    .delete(invoiceTemplates)
    .where(and(eq(invoiceTemplates.id, templateId), eq(invoiceTemplates.workspaceId, workspaceId)));
}

export async function listInvoiceTemplates() {
  const workspaceId = await getWorkspaceId();

  return db
    .select({
      id: invoiceTemplates.id,
      name: invoiceTemplates.name,
      terms: invoiceTemplates.terms,
      notes: invoiceTemplates.notes,
      defaultCurrency: invoiceTemplates.defaultCurrency,
      defaultTaxRate: invoiceTemplates.defaultTaxRate,
      lineItems: invoiceTemplates.lineItems,
      createdAt: invoiceTemplates.createdAt,
      updatedAt: invoiceTemplates.updatedAt,
    })
    .from(invoiceTemplates)
    .where(eq(invoiceTemplates.workspaceId, workspaceId))
    .orderBy(desc(invoiceTemplates.updatedAt))
    .limit(100);
}
