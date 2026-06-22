"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { expenseRecurring, expenses, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

const createRecurringSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("IDR"),
  categoryId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updateRecurringSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// Compute the next due date given lastGeneratedDate + frequency
function nextDueDate(last: string, frequency: "monthly" | "quarterly" | "yearly"): string {
  const d = new Date(last);
  if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function createRecurring(input: z.infer<typeof createRecurringSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createRecurringSchema.parse(input);

  const [rec] = await db.insert(expenseRecurring).values({
    workspaceId: parsed.workspaceId,
    name: parsed.name,
    amount: parsed.amount.toFixed(2),
    currency: parsed.currency,
    categoryId: parsed.categoryId || null,
    projectId: parsed.projectId || null,
    frequency: parsed.frequency,
    startDate: parsed.startDate,
    endDate: parsed.endDate || null,
    notes: parsed.notes || null,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_recurring_expense", "expense_recurring", rec.id, {
    name: rec.name,
    amount: rec.amount,
  });
  return rec;
}

export async function updateRecurring(recurringId: string, input: z.infer<typeof updateRecurringSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateRecurringSchema.parse(input);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.amount !== undefined) update.amount = parsed.amount.toFixed(2);
  if (parsed.currency !== undefined) update.currency = parsed.currency;
  if (parsed.categoryId !== undefined) update.categoryId = parsed.categoryId;
  if (parsed.projectId !== undefined) update.projectId = parsed.projectId;
  if (parsed.frequency !== undefined) update.frequency = parsed.frequency;
  if (parsed.endDate !== undefined) update.endDate = parsed.endDate;
  if (parsed.isActive !== undefined) update.isActive = parsed.isActive;
  if (parsed.notes !== undefined) update.notes = parsed.notes;

  const [rec] = await db.update(expenseRecurring)
    .set(update)
    .where(and(eq(expenseRecurring.id, recurringId), eq(expenseRecurring.workspaceId, workspaceId)))
    .returning();
  if (!rec) throw new Error("Recurring expense not found");
  await writeActivityLog(workspaceId, user.id, "updated_recurring_expense", "expense_recurring", recurringId);
  return rec;
}

export async function deleteRecurring(recurringId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const [r] = await db.delete(expenseRecurring)
    .where(and(eq(expenseRecurring.id, recurringId), eq(expenseRecurring.workspaceId, workspaceId)))
    .returning();
  if (!r) throw new Error("Not found");
  return { id: recurringId };
}

// Generate one expense from a recurring rule; advances lastGeneratedDate
export async function generateFromRecurring(recurringId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [rec] = await db.select().from(expenseRecurring)
    .where(and(eq(expenseRecurring.id, recurringId), eq(expenseRecurring.workspaceId, workspaceId)))
    .limit(1);
  if (!rec) throw new Error("Not found");
  if (!rec.isActive) throw new Error("Recurring expense is paused");

  // Date for the generated expense = today (or lastGeneratedDate + frequency)
  const today = new Date().toISOString().slice(0, 10);
  const expenseDate = rec.lastGeneratedDate ?? today;

  const [exp] = await db.insert(expenses).values({
    workspaceId,
    categoryId: rec.categoryId,
    projectId: rec.projectId,
    amount: rec.amount,
    currency: rec.currency,
    date: expenseDate,
    description: `${rec.name}${rec.notes ? ` — ${rec.notes}` : ""}`,
    vendor: null,
    createdBy: user.id,
  }).returning();

  // Advance lastGeneratedDate
  const newLast = nextDueDate(expenseDate, rec.frequency);
  await db.update(expenseRecurring)
    .set({ lastGeneratedDate: newLast, updatedAt: new Date() })
    .where(eq(expenseRecurring.id, recurringId));

  await writeActivityLog(workspaceId, user.id, "generated_recurring_expense", "expense", exp.id, {
    recurringId,
    name: rec.name,
  });
  return exp;
}
