"use server";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getT() {
  const lang = await getCurrentLang();
  return createT(lang);
}
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { expenses, expenseCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  assertWorkspaceWritable,
  assertWorkspaceMember,
  assertClientInWorkspace,
  assertProjectInWorkspace,
} from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { getSignedDownloadUrl, R2_BUCKET } from "@/lib/r2";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

/** Ensure optional client/project belong to workspace and match each other. */
async function resolveExpenseRelations(
  userId: string,
  workspaceId: string,
  input: { clientId?: string | null; projectId?: string | null },
): Promise<{ clientId: string | null; projectId: string | null }> {
  let clientId = input.clientId || null;
  const projectId = input.projectId || null;

  if (projectId) {
    const project = await assertProjectInWorkspace(db, userId, workspaceId, projectId);
    if (clientId && project.clientId !== clientId) {
      throw new Error("Proyek tidak milik klien yang dipilih");
    }
    // Project wins: auto-align client to project owner
    clientId = project.clientId;
  } else if (clientId) {
    await assertClientInWorkspace(db, userId, workspaceId, clientId);
  }

  return { clientId, projectId };
}

const createExpenseSchema = z.object({
  workspaceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("IDR"),
  date: z.string().min(1),
  description: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  vendor: z.string().max(200).optional().nullable(),
  taxIncluded: z.boolean().default(false),
  taxAmount: z.number().nonnegative().optional().nullable(),
  receiptUrl: z.string().max(1000).optional().nullable(),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  date: z.string().optional(),
  description: z.string().min(1).max(500).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  taxIncluded: z.boolean().optional(),
  taxAmount: z.number().nonnegative().nullable().optional(),
  receiptUrl: z.string().max(1000).nullable().optional(),
});

const createCategorySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  icon: z.string().max(50).optional().nullable(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).nullable().optional(),
});

export async function createExpense(input: z.infer<typeof createExpenseSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createExpenseSchema.parse(input);
  const relations = await resolveExpenseRelations(user.id, parsed.workspaceId, {
    clientId: parsed.clientId,
    projectId: parsed.projectId,
  });

  const [expense] = await db.insert(expenses).values({
    workspaceId: parsed.workspaceId,
    categoryId: parsed.categoryId || null,
    projectId: relations.projectId,
    clientId: relations.clientId,
    amount: parsed.amount.toFixed(2),
    currency: parsed.currency,
    date: parsed.date,
    description: parsed.description,
    vendor: parsed.vendor || null,
    taxIncluded: parsed.taxIncluded,
    taxAmount: parsed.taxAmount != null ? parsed.taxAmount.toFixed(2) : null,
    receiptUrl: parsed.receiptUrl || null,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_expense", "expense", expense.id, {
    amount: expense.amount,
    description: expense.description,
  });
  return expense;
}

export async function updateExpense(expenseId: string, input: z.infer<typeof updateExpenseSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateExpenseSchema.parse(input);

  const [existing] = await db
    .select({
      clientId: expenses.clientId,
      projectId: expenses.projectId,
    })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.workspaceId, workspaceId)))
    .limit(1);
  const t = await getT();
  if (!existing) throw new Error(t("Pengeluaran tidak ditemukan", "Expense not found"));

  const nextClientId = parsed.clientId !== undefined ? parsed.clientId : existing.clientId;
  const nextProjectId = parsed.projectId !== undefined ? parsed.projectId : existing.projectId;
  const relations =
    parsed.clientId !== undefined || parsed.projectId !== undefined
      ? await resolveExpenseRelations(user.id, workspaceId, {
          clientId: nextClientId,
          projectId: nextProjectId,
        })
      : { clientId: existing.clientId, projectId: existing.projectId };

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.amount !== undefined) update.amount = parsed.amount.toFixed(2);
  if (parsed.currency !== undefined) update.currency = parsed.currency;
  if (parsed.date !== undefined) update.date = parsed.date;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.categoryId !== undefined) update.categoryId = parsed.categoryId;
  if (parsed.projectId !== undefined || parsed.clientId !== undefined) {
    update.projectId = relations.projectId;
    update.clientId = relations.clientId;
  }
  if (parsed.vendor !== undefined) update.vendor = parsed.vendor;
  if (parsed.taxIncluded !== undefined) update.taxIncluded = parsed.taxIncluded;
  if (parsed.taxAmount !== undefined) update.taxAmount = parsed.taxAmount != null ? parsed.taxAmount.toFixed(2) : null;
  if (parsed.receiptUrl !== undefined) update.receiptUrl = parsed.receiptUrl;

  const [expense] = await db.update(expenses)
    .set(update)
    .where(and(eq(expenses.id, expenseId), eq(expenses.workspaceId, workspaceId)))
    .returning();

  if (!expense) throw new Error(t("Pengeluaran tidak ditemukan", "Expense not found"));
  await writeActivityLog(workspaceId, user.id, "updated_expense", "expense", expense.id);
  return expense;
}

export async function deleteExpense(expenseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [expense] = await db.delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.workspaceId, workspaceId)))
    .returning();

  const t = await getT();
  if (!expense) throw new Error(t("Pengeluaran tidak ditemukan", "Expense not found"));
  await writeActivityLog(workspaceId, user.id, "deleted_expense", "expense", expenseId);
  return { id: expenseId };
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createCategorySchema.parse(input);

  const [category] = await db.insert(expenseCategories).values({
    workspaceId: parsed.workspaceId,
    name: parsed.name,
    color: parsed.color,
    icon: parsed.icon || null,
    isDefault: false,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_expense_category", "expense_category", category.id);
  return category;
}

export async function updateCategory(categoryId: string, input: z.infer<typeof updateCategorySchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateCategorySchema.parse(input);

  const update: Record<string, unknown> = {};
  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.color !== undefined) update.color = parsed.color;
  if (parsed.icon !== undefined) update.icon = parsed.icon;

  const [cat] = await db.update(expenseCategories)
    .set(update)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.workspaceId, workspaceId)))
    .returning();
  const t = await getT();
  if (!cat) throw new Error(t("Kategori tidak ditemukan", "Category not found"));
  await writeActivityLog(workspaceId, user.id, "updated_expense_category", "expense_category", categoryId);
  return cat;
}

export async function deleteCategory(categoryId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [cat] = await db.delete(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.workspaceId, workspaceId)))
    .returning();
  const t = await getT();
  if (!cat) throw new Error(t("Kategori tidak ditemukan", "Category not found"));
  return { id: categoryId };
}

export async function getExpenseReceiptDownloadUrl(expenseId: string): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [row] = await db
    .select({ receiptUrl: expenses.receiptUrl, workspaceId: expenses.workspaceId })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.workspaceId, workspaceId)))
    .limit(1);
  if (!row?.receiptUrl) return null;
  // Only sign R2 keys we own; skip external http URLs
  if (row.receiptUrl.startsWith("http://") || row.receiptUrl.startsWith("https://")) {
    return row.receiptUrl;
  }
  if (!row.receiptUrl.startsWith(`workspaces/${workspaceId}/`)) {
    throw new Error("Invalid receipt key");
  }
  void R2_BUCKET; // ensure module init
  return getSignedDownloadUrl(row.receiptUrl, 300);
}
