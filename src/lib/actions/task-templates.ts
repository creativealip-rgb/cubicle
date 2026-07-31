"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { taskTemplateItems, taskTemplates, workspaceMembers } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  target: z.enum(["fixed_price", "hourly_retainer", "all"]),
  status: z.enum(["active", "archived"]).default("active"),
});

const templateUpdateSchema = templateSchema.partial().refine((value) => Object.keys(value).length > 0, "No changes supplied");
const itemSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(8000).nullable().optional(),
  defaultAssigneeId: z.string().min(1).nullable().optional(),
  position: z.number().int().nonnegative(),
});
const itemUpdateSchema = itemSchema.partial().refine((value) => Object.keys(value).length > 0, "No changes supplied");
const idSchema = z.string().uuid();

export async function parseTaskTemplateInput(input: unknown) {
  return templateSchema.parse(input);
}

export async function parseTaskTemplateItemInput(input: unknown) {
  return itemSchema.parse(input);
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase("id-ID");
}

export async function nextDuplicateTemplateName(sourceName: string, existingNames: readonly string[]) {
  const base = sourceName.trim();
  const existing = new Set(existingNames.map(normalizeName));
  let suffix = 1;
  while (true) {
    const candidate = suffix === 1 ? `${base} (Salinan)` : `${base} (Salinan ${suffix})`;
    if (!existing.has(normalizeName(candidate))) return candidate;
    suffix += 1;
  }
}

export async function planTaskTemplateItemReorder(currentIds: readonly string[], orderedIds: readonly string[]) {
  if (orderedIds.length !== currentIds.length) throw new Error("Reorder must contain complete item IDs");
  if (new Set(orderedIds).size !== orderedIds.length) throw new Error("Reorder item IDs must be unique");
  const current = new Set(currentIds);
  if (orderedIds.some((id) => !current.has(id))) throw new Error("Reorder items must belong to same template");
  const offset = currentIds.length;
  return {
    temporary: orderedIds.map((id, position) => ({ id, position: offset + position })),
    final: orderedIds.map((id, position) => ({ id, position })),
  };
}

async function actionContext(writable: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  if (writable) await assertWorkspaceWritable(db, user.id, workspaceId);
  else await assertWorkspaceMember(db, user.id, workspaceId);
  return { user, workspaceId };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function findTemplate(database: typeof db | Transaction, workspaceId: string, templateId: string) {
  const [template] = await database.select().from(taskTemplates).where(and(
    eq(taskTemplates.id, templateId),
    eq(taskTemplates.workspaceId, workspaceId),
  )).limit(1);
  if (!template) throw new Error("Template tidak ditemukan");
  return template;
}

async function assertActiveTemplate(database: typeof db | Transaction, workspaceId: string, templateId: string) {
  const template = await findTemplate(database, workspaceId, templateId);
  if (template.status !== "active") throw new Error("Template arsip tidak dapat diubah");
  return template;
}

async function assertAssigneeMembership(database: typeof db | Transaction, workspaceId: string, defaultAssigneeId: string | null | undefined) {
  if (!defaultAssigneeId) return;
  const [member] = await database.select({ userId: workspaceMembers.userId }).from(workspaceMembers).where(and(
    eq(workspaceMembers.workspaceId, workspaceId),
    eq(workspaceMembers.userId, defaultAssigneeId),
  )).limit(1);
  if (!member) throw new Error("Assignee bukan anggota workspace");
}

export async function getTaskTemplates(options: { includeArchived?: boolean; templateId?: string } = {}) {
  const { workspaceId } = await actionContext(false);
  if (options.templateId) {
    const templateId = idSchema.parse(options.templateId);
    const template = await findTemplate(db, workspaceId, templateId);
    const items = await db.select().from(taskTemplateItems).where(and(
      eq(taskTemplateItems.workspaceId, workspaceId),
      eq(taskTemplateItems.templateId, templateId),
    )).orderBy(asc(taskTemplateItems.position));
    return [{ ...template, items }];
  }
  const predicates = [eq(taskTemplates.workspaceId, workspaceId)];
  if (!options.includeArchived) predicates.push(eq(taskTemplates.status, "active"));
  return db.select().from(taskTemplates).where(and(...predicates)).orderBy(desc(taskTemplates.updatedAt));
}

export async function createTaskTemplate(input: unknown) {
  const { user, workspaceId } = await actionContext(true);
  const parsed = templateSchema.parse(input);
  const [template] = await db.insert(taskTemplates).values({
    workspaceId, name: parsed.name, description: parsed.description ?? null,
    target: parsed.target, status: parsed.status, createdBy: user.id,
  }).returning();
  return template;
}

export async function updateTaskTemplate(templateIdInput: string, input: unknown) {
  const { workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  const parsed = templateUpdateSchema.parse(input);
  await assertActiveTemplate(db, workspaceId, templateId);
  const [template] = await db.update(taskTemplates).set({ ...parsed, updatedAt: new Date() }).where(and(
    eq(taskTemplates.id, templateId), eq(taskTemplates.workspaceId, workspaceId), eq(taskTemplates.status, "active"),
  )).returning();
  if (!template) throw new Error("Template tidak ditemukan");
  return template;
}

export async function archiveTaskTemplate(templateIdInput: string) {
  const { workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  await findTemplate(db, workspaceId, templateId);
  const [template] = await db.update(taskTemplates).set({ status: "archived", updatedAt: new Date() }).where(and(
    eq(taskTemplates.id, templateId), eq(taskTemplates.workspaceId, workspaceId),
  )).returning();
  return template;
}

export async function restoreTaskTemplate(templateIdInput: string) {
  const { workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  return db.transaction(async (tx) => {
    const template = await findTemplate(tx, workspaceId, templateId);
    if (template.status === "active") return template;
    const [conflict] = await tx.select({ id: taskTemplates.id }).from(taskTemplates).where(and(
      eq(taskTemplates.workspaceId, workspaceId), eq(taskTemplates.status, "active"), eq(taskTemplates.normalizedName, normalizeName(template.name)),
    )).limit(1);
    if (conflict) throw new Error("RENAME_REQUIRED: Nama template aktif sudah digunakan");
    const [restored] = await tx.update(taskTemplates).set({ status: "active", updatedAt: new Date() }).where(and(
      eq(taskTemplates.id, templateId), eq(taskTemplates.workspaceId, workspaceId), eq(taskTemplates.status, "archived"),
    )).returning();
    return restored;
  });
}

export async function duplicateTaskTemplate(templateIdInput: string) {
  const { user, workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  return db.transaction(async (tx) => {
    const source = await findTemplate(tx, workspaceId, templateId);
    const existing = await tx.select({ name: taskTemplates.name }).from(taskTemplates).where(and(
      eq(taskTemplates.workspaceId, workspaceId), eq(taskTemplates.status, "active"),
    ));
    const [copy] = await tx.insert(taskTemplates).values({
      workspaceId, name: await nextDuplicateTemplateName(source.name, existing.map((row) => row.name)),
      description: source.description, target: source.target, status: "active", createdBy: user.id,
    }).returning();
    const items = await tx.select().from(taskTemplateItems).where(and(
      eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    )).orderBy(asc(taskTemplateItems.position));
    if (items.length) await tx.insert(taskTemplateItems).values(items.map((item) => ({
      workspaceId, templateId: copy.id, title: item.title, description: item.description,
      defaultAssigneeId: item.defaultAssigneeId, position: item.position,
    })));
    return copy;
  });
}

export async function createTaskTemplateItem(templateIdInput: string, input: unknown) {
  const { workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  const parsed = itemSchema.parse(input);
  await assertActiveTemplate(db, workspaceId, templateId);
  await assertAssigneeMembership(db, workspaceId, parsed.defaultAssigneeId);
  const [item] = await db.insert(taskTemplateItems).values({
    workspaceId, templateId, title: parsed.title, description: parsed.description ?? null,
    defaultAssigneeId: parsed.defaultAssigneeId ?? null, position: parsed.position,
  }).returning();
  return item;
}

export async function updateTaskTemplateItem(itemIdInput: string, input: unknown) {
  const { workspaceId } = await actionContext(true);
  const itemId = idSchema.parse(itemIdInput);
  const parsed = itemUpdateSchema.parse(input);
  const [current] = await db.select().from(taskTemplateItems).where(and(
    eq(taskTemplateItems.id, itemId), eq(taskTemplateItems.workspaceId, workspaceId),
  )).limit(1);
  if (!current) throw new Error("Item template tidak ditemukan");
  await assertActiveTemplate(db, workspaceId, current.templateId);
  if (parsed.defaultAssigneeId !== undefined) await assertAssigneeMembership(db, workspaceId, parsed.defaultAssigneeId);
  const [item] = await db.update(taskTemplateItems).set({ ...parsed, updatedAt: new Date() }).where(and(
    eq(taskTemplateItems.id, itemId), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, current.templateId),
  )).returning();
  return item;
}

export async function removeTaskTemplateItem(itemIdInput: string) {
  const { workspaceId } = await actionContext(true);
  const itemId = idSchema.parse(itemIdInput);
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(taskTemplateItems).where(and(
      eq(taskTemplateItems.id, itemId), eq(taskTemplateItems.workspaceId, workspaceId),
    )).limit(1);
    if (!item) throw new Error("Item template tidak ditemukan");
    await assertActiveTemplate(tx, workspaceId, item.templateId);
    await tx.delete(taskTemplateItems).where(and(
      eq(taskTemplateItems.id, itemId), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, item.templateId),
    ));
    return { success: true };
  });
}

export async function reorderTaskTemplateItems(templateIdInput: string, orderedIdInputs: readonly string[]) {
  const { workspaceId } = await actionContext(true);
  const templateId = idSchema.parse(templateIdInput);
  const orderedIds = z.array(idSchema).parse(orderedIdInputs);
  return db.transaction(async (tx) => {
    await assertActiveTemplate(tx, workspaceId, templateId);
    const current = await tx.select({ id: taskTemplateItems.id }).from(taskTemplateItems).where(and(
      eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    )).orderBy(asc(taskTemplateItems.position));
    const plan = await planTaskTemplateItemReorder(current.map((item) => item.id), orderedIds);
    for (const item of plan.temporary) await tx.update(taskTemplateItems).set({ position: item.position, updatedAt: new Date() }).where(and(
      eq(taskTemplateItems.id, item.id), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    ));
    for (const item of plan.final) await tx.update(taskTemplateItems).set({ position: item.position, updatedAt: new Date() }).where(and(
      eq(taskTemplateItems.id, item.id), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    ));
    return { success: true };
  });
}
