"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, taskTemplateImports, taskTemplateItems, taskTemplates, tasks, workspaceMembers } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { resolveBillingModel } from "@/lib/billing-model";
import { resolveProjectTaskMode } from "@/lib/task-work-mode";
import { previewTemplateImport, type DuplicateAction } from "@/lib/task-template-import";
import { canonicalTaskTemplateImportFingerprint, isTaskTemplateTargetCompatible } from "@/lib/task-template-import-policies";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  target: z.enum(["fixed_price", "hourly_retainer", "all"]),
  status: z.enum(["active", "archived"]).default("active"),
});

const templateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(8000).nullable().optional(),
  target: z.enum(["fixed_price", "hourly_retainer", "all"]).optional(),
  status: z.enum(["active", "archived"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "No changes supplied");
const itemSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(8000).nullable().optional(),
  defaultAssigneeId: z.string().min(1).nullable().optional(),
  position: z.number().int().nonnegative(),
});
const itemUpdateSchema = itemSchema.partial().refine((value) => Object.keys(value).length > 0, "No changes supplied");
const idSchema = z.string().uuid();
const getTaskTemplatesOptionsSchema = z.object({
  includeArchived: z.boolean().default(false),
  templateId: idSchema.optional(),
}).strict().default({ includeArchived: false });
const importSelectionSchema = z.object({
  itemId: idSchema,
  duplicateAction: z.enum(["skip", "keep"]).optional(),
}).strict();
const taskTemplateImportSchema = z.object({
  projectId: idSchema,
  templateIds: z.array(idSchema).min(1),
  selectedItems: z.array(importSelectionSchema).default([]),
  allowIncompatibleTarget: z.boolean().default(false),
  idempotencyKey: z.string().uuid().optional(),
}).strict();

export async function parseTaskTemplateInput(input: unknown) {
  return templateSchema.parse(input);
}

export async function parseTaskTemplateUpdateInput(input: unknown) {
  return templateUpdateSchema.parse(input);
}

export async function parseGetTaskTemplatesOptions(input: unknown) {
  return getTaskTemplatesOptionsSchema.parse(input);
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

export async function planTaskTemplateItemReorder(currentRows: readonly { id: string; position: number }[], orderedIds: readonly string[]) {
  if (orderedIds.length !== currentRows.length) throw new Error("Reorder must contain complete item IDs");
  if (new Set(orderedIds).size !== orderedIds.length) throw new Error("Reorder item IDs must be unique");
  const current = new Set(currentRows.map((row) => row.id));
  if (orderedIds.some((id) => !current.has(id))) throw new Error("Reorder items must belong to same template");
  const offset = currentRows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
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

export async function getTaskTemplates(optionsInput: unknown = undefined) {
  const { workspaceId } = await actionContext(false);
  const options = await parseGetTaskTemplatesOptions(optionsInput);
  if (options.templateId) {
    const templateId = options.templateId;
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
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`task-template-duplicate-name:${workspaceId}`}, 0))`);
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
    const current = await tx.select({ id: taskTemplateItems.id, position: taskTemplateItems.position }).from(taskTemplateItems).where(and(
      eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    )).orderBy(asc(taskTemplateItems.position));
    const plan = await planTaskTemplateItemReorder(current, orderedIds);
    for (const item of plan.temporary) await tx.update(taskTemplateItems).set({ position: item.position, updatedAt: new Date() }).where(and(
      eq(taskTemplateItems.id, item.id), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    ));
    for (const item of plan.final) await tx.update(taskTemplateItems).set({ position: item.position, updatedAt: new Date() }).where(and(
      eq(taskTemplateItems.id, item.id), eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    ));
    return { success: true };
  });
}

async function loadTaskTemplateImportContext(database: typeof db | Transaction, workspaceId: string, input: z.infer<typeof taskTemplateImportSchema>) {
  const [project] = await database.select().from(projects).where(and(
    eq(projects.id, input.projectId), eq(projects.workspaceId, workspaceId),
  )).limit(1);
  if (!project) throw new Error("Project tidak ditemukan");
  const model = resolveBillingModel(project);
  const mode = resolveProjectTaskMode(project.taskModePolicy, model);
  const templatesWithItems = [];
  for (const templateId of input.templateIds) {
    const template = await assertActiveTemplate(database, workspaceId, templateId);
    if (!input.allowIncompatibleTarget && !isTaskTemplateTargetCompatible(template.target, model)) {
      throw new Error("TARGET_INCOMPATIBLE: Template tidak sesuai model billing Project");
    }
    const items = await database.select().from(taskTemplateItems).where(and(
      eq(taskTemplateItems.workspaceId, workspaceId), eq(taskTemplateItems.templateId, templateId),
    )).orderBy(asc(taskTemplateItems.position));
    for (const item of items) await assertAssigneeMembership(database, workspaceId, item.defaultAssigneeId);
    templatesWithItems.push({ template, items });
  }
  const existing = await database.select({ title: tasks.title }).from(tasks).where(and(
    eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, input.projectId),
  ));
  const decisions = new Map(input.selectedItems.map((item) => [item.itemId, item.duplicateAction]));
  const selected = new Set(input.selectedItems.map((item) => item.itemId));
  const preview = previewTemplateImport({
    mode,
    existingProjectTitles: existing.map((item) => item.title),
    templates: templatesWithItems.map(({ template, items }) => ({
      id: template.id,
      items: items.map((item) => ({
        id: item.id, title: item.title, position: item.position,
        selected: selected.has(item.id),
        duplicateAction: decisions.get(item.id) as DuplicateAction | undefined,
      })),
    })),
  });
  return { project, model, mode, templatesWithItems, preview };
}

export async function previewTaskTemplateImport(inputValue: unknown) {
  const { workspaceId } = await actionContext(false);
  const input = taskTemplateImportSchema.parse(inputValue);
  const context = await loadTaskTemplateImportContext(db, workspaceId, input);
  return { ...context, payloadFingerprint: canonicalTaskTemplateImportFingerprint(input) };
}

export async function importTaskTemplates(inputValue: unknown) {
  const { user, workspaceId } = await actionContext(true);
  const input = taskTemplateImportSchema.extend({ idempotencyKey: z.string().uuid(), previewFingerprint: z.string().min(1) }).parse(inputValue);
  const fingerprintPayload = {
    projectId: input.projectId,
    templateIds: input.templateIds,
    selectedItems: input.selectedItems,
    allowIncompatibleTarget: input.allowIncompatibleTarget,
  };
  const payloadFingerprint = canonicalTaskTemplateImportFingerprint(fingerprintPayload);
  if (input.previewFingerprint !== payloadFingerprint) throw new Error("STALE_PREVIEW: Preview import sudah berubah");
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`task-template-import:${workspaceId}:${input.projectId}:${input.idempotencyKey}`}, 0))`);
    const [existingLedger] = await tx.select().from(taskTemplateImports).where(and(
      eq(taskTemplateImports.workspaceId, workspaceId), eq(taskTemplateImports.projectId, input.projectId), eq(taskTemplateImports.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    if (existingLedger) {
      if (existingLedger.payloadFingerprint !== payloadFingerprint) throw new Error("IDEMPOTENCY_CONFLICT: Kunci import digunakan untuk payload berbeda");
      if (existingLedger.completedAt && existingLedger.result) return existingLedger.result;
      throw new Error("IMPORT_IN_PROGRESS: Import sebelumnya belum selesai");
    }
    await tx.insert(taskTemplateImports).values({
      workspaceId, projectId: input.projectId, idempotencyKey: input.idempotencyKey, payloadFingerprint,
    });
    const context = await loadTaskTemplateImportContext(tx, workspaceId, input);
    const included = context.preview.filter((item) => item.included);
    const [{ maxPosition }] = await tx.select({ maxPosition: sql<number>`coalesce(max(${tasks.position}), -1)` }).from(tasks).where(and(
      eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, input.projectId),
    ));
    const sourceItems = new Map(context.templatesWithItems.flatMap(({ items }) => items.map((item) => [item.id, item] as const)));
    const inserted = included.length ? await tx.insert(tasks).values(included.map((item, index) => {
      const source = sourceItems.get(item.itemId)!;
      return {
        workspaceId, projectId: input.projectId, title: source.title, description: source.description,
        assigneeId: source.defaultAssigneeId, mode: context.mode, lifecycle: "active" as const,
        status: "todo" as const, priority: "medium" as const, position: Number(maxPosition) + 1 + index,
        templateItemSourceId: source.id, createdBy: user.id,
        behavior: context.mode === "workflow" ? "one_time" as const : "recurring" as const,
      };
    })).returning({ id: tasks.id, title: tasks.title, position: tasks.position }) : [];
    const result = { projectId: input.projectId, created: inserted, skipped: context.preview.filter((item) => !item.included).map((item) => item.itemId) };
    await tx.update(taskTemplateImports).set({ result, completedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(taskTemplateImports.workspaceId, workspaceId), eq(taskTemplateImports.projectId, input.projectId), eq(taskTemplateImports.idempotencyKey, input.idempotencyKey),
    ));
    return result;
  });
}
