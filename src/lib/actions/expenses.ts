"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { expenses, expenseCategories, projects, clients } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { getSignedUploadUrl as getR2UploadUrl, getSignedDownloadUrl, R2_BUCKET } from "@/lib/r2";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
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
  if (parsed.taxAmount !== undefined) update.taxAmount = parsed.taxAmount != null ? parsed.taxAmount.toFixed(2) : null;
  if (parsed.receiptUrl !== undefined) update.receiptUrl = parsed.receiptUrl;

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
  if (!cat) throw new Error("Category not found");
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
  if (!cat) throw new Error("Category not found");
  return { id: categoryId };
}

const receiptUploadSchema = z.object({
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  size: z.number().positive().max(10 * 1024 * 1024, "Receipt must be under 10MB"),
});

/** Presigned PUT for expense receipt. Stores key under workspaces/{ws}/expenses/... */
export async function getExpenseReceiptUploadUrl(
  input: z.infer<typeof receiptUploadSchema>,
): Promise<{ uploadUrl: string; storageKey: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = receiptUploadSchema.parse(input);

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(parsed.mime)) {
    throw new Error("Receipt must be image (jpg/png/webp/gif) or PDF");
  }

  const crypto = await import("crypto");
  const id = parsed.expenseId || crypto.randomUUID();
  const safeFilename = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `workspaces/${parsed.workspaceId}/expenses/${id}/${safeFilename}`;
  const uploadUrl = await getR2UploadUrl(storageKey, parsed.mime, 300);
  return { uploadUrl, storageKey };
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

export async function exportExpensesCsv(input?: {
  month?: string;
  categoryId?: string;
  q?: string;
}): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const conditions = [eq(expenses.workspaceId, workspaceId)];
  if (input?.month && /^\d{4}-\d{2}$/.test(input.month)) {
    conditions.push(gte(expenses.date, `${input.month}-01`));
    conditions.push(lte(expenses.date, `${input.month}-31`));
  }
  if (input?.categoryId) {
    conditions.push(eq(expenses.categoryId, input.categoryId));
  }

  const rows = await db
    .select({
      date: expenses.date,
      description: expenses.description,
      amount: expenses.amount,
      currency: expenses.currency,
      vendor: expenses.vendor,
      taxIncluded: expenses.taxIncluded,
      taxAmount: expenses.taxAmount,
      categoryName: expenseCategories.name,
      projectName: projects.name,
      clientName: clients.name,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(clients, eq(clients.id, expenses.clientId))
    .where(and(...conditions))
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(5000);

  const q = input?.q?.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.description.toLowerCase().includes(q) ||
          (r.vendor?.toLowerCase().includes(q) ?? false) ||
          (r.categoryName?.toLowerCase().includes(q) ?? false) ||
          (r.projectName?.toLowerCase().includes(q) ?? false) ||
          (r.clientName?.toLowerCase().includes(q) ?? false),
      )
    : rows;

  const esc = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = [
    "date",
    "description",
    "amount",
    "currency",
    "category",
    "vendor",
    "project",
    "client",
    "tax_included",
    "tax_amount",
  ].join(",");

  const lines = filtered.map((r) =>
    [
      esc(r.date),
      esc(r.description),
      esc(r.amount),
      esc(r.currency),
      esc(r.categoryName),
      esc(r.vendor),
      esc(r.projectName),
      esc(r.clientName),
      esc(r.taxIncluded),
      esc(r.taxAmount),
    ].join(","),
  );

  return [header, ...lines].join("\n");
}
