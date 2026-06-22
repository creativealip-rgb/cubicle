"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { expenses, expenseCategories, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

const createExpenseSchema = z.object({
  workspaceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("USD"),
  date: z.string().min(1),
  description: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  vendor: z.string().max(200).optional().nullable(),
  taxIncluded: z.boolean().default(false),
  taxAmount: z.number().nonnegative().optional().nullable(),
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
});

const createCategorySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  icon: z.string().max(50).optional().nullable(),
});

export async function createExpense(input: z.infer<typeof createExpenseSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createExpenseSchema.parse(input);

  const [expense] = await db.insert(expenses).values({
    workspaceId: parsed.workspaceId,
    categoryId: parsed.categoryId || null,
    projectId: parsed.projectId || null,
    clientId: parsed.clientId || null,
    amount: parsed.amount.toFixed(2),
    currency: parsed.currency,
    date: parsed.date,
    description: parsed.description,
    vendor: parsed.vendor || null,
    taxIncluded: parsed.taxIncluded,
    taxAmount: parsed.taxAmount ? parsed.taxAmount.toFixed(2) : null,
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

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.amount !== undefined) update.amount = parsed.amount.toFixed(2);
  if (parsed.currency !== undefined) update.currency = parsed.currency;
  if (parsed.date !== undefined) update.date = parsed.date;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.categoryId !== undefined) update.categoryId = parsed.categoryId;
  if (parsed.projectId !== undefined) update.projectId = parsed.projectId;
  if (parsed.clientId !== undefined) update.clientId = parsed.clientId;
  if (parsed.vendor !== undefined) update.vendor = parsed.vendor;
  if (parsed.taxIncluded !== undefined) update.taxIncluded = parsed.taxIncluded;
  if (parsed.taxAmount !== undefined) update.taxAmount = parsed.taxAmount ? parsed.taxAmount.toFixed(2) : null;

  const [expense] = await db.update(expenses)
    .set(update)
    .where(and(eq(expenses.id, expenseId), eq(expenses.workspaceId, workspaceId)))
    .returning();

  if (!expense) throw new Error("Expense not found");
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

  if (!expense) throw new Error("Expense not found");
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

export async function deleteCategory(categoryId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [cat] = await db.delete(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.workspaceId, workspaceId)))
    .returning();
  if (!cat) throw new Error("Category not found");
  return { id: categoryId };
}
