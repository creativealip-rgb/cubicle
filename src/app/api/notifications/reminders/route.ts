import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, tasks } from "@/db/schema";
import { and, eq, lte, ne, sql } from "drizzle-orm";
import { createNotification, notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { formatMoney } from "@/lib/utils";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  // In production, missing CRON_SECRET means endpoint stays locked.
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayDate = today.toISOString().slice(0, 10);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  let dueTaskCount = 0;
  let overdueInvoiceCount = 0;

  // Due-date reminder: assigned tasks due today/tomorrow and not done.
  const dueTasks = await db
    .select({
      id: tasks.id,
      workspaceId: tasks.workspaceId,
      title: tasks.title,
      assigneeId: tasks.assigneeId,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(and(
      ne(tasks.status, "done"),
      lte(tasks.dueDate, tomorrowDate),
      sql`${tasks.dueDate} >= ${todayDate}`,
      sql`${tasks.assigneeId} is not null`
    ))
    .limit(200);

  for (const task of dueTasks) {
    if (!task.assigneeId) continue;
    await createNotification({
      workspaceId: task.workspaceId,
      userId: task.assigneeId,
      type: "task_due_soon",
      title: `Task due ${task.dueDate === todayDate ? "today" : "soon"}`,
      body: task.title,
      link: `/app/tasks?focus=${task.id}`,
      entityType: "task",
      entityId: task.id,
      actorId: null,
    });
    dueTaskCount++;
  }

  // Overdue invoice alert: sent/viewed/overdue invoices past due and unpaid.
  const overdueInvoices = await db
    .select({
      id: invoices.id,
      workspaceId: invoices.workspaceId,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(and(
      sql`${invoices.dueDate} is not null`,
      sql`${invoices.dueDate} < ${todayDate}`,
      sql`${invoices.status} in ('sent', 'viewed', 'overdue')`
    ))
    .limit(200);

  for (const inv of overdueInvoices) {
    await db.update(invoices).set({ status: "overdue", updatedAt: new Date() }).where(eq(invoices.id, inv.id));
    await notifyWorkspaceMembers(inv.workspaceId, {
      type: "invoice_overdue",
      title: `Invoice ${inv.invoiceNumber} is overdue`,
      body: `${formatMoney(inv.total, inv.currency)} due ${inv.dueDate}`,
      link: `/app/invoices/${inv.id}`,
      entityType: "invoice",
      entityId: inv.id,
      actorId: null,
    });
    overdueInvoiceCount++;
  }

  return NextResponse.json({ ok: true, dueTaskCount, overdueInvoiceCount });
}

export async function GET(req: Request) {
  return POST(req);
}
