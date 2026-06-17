/**
 * AI assistant tools.
 *
 * Read tools (always allowed): list_clients, list_projects, list_tasks,
 *   list_invoices, get_workspace_summary, list_workspace_members,
 *   get_client, get_project, get_task, get_invoice
 *
 * Action tools (user must confirm): update_task_status, draft_invoice_reminder
 *   Action tools return a `confirmation` payload — the UI shows a
 *   confirm card before any DB write happens.
 */

import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  invoiceItems,
  invoices,
  payments,
  projects,
  tasks,
  users,
  workspaceMembers,
  workspaces,
  promptTemplates,
  expenses,
  expenseCategories,
  proposals,
  expenseRecurring,
  contracts,
  questionnaires,
  questionnaireResponses,
} from "@/db/schema";
import type { ToolDefinition } from "./client";

let _workspaceIdCache: { id: string; slug: string; name: string } | null = null;
async function getWorkspace(): Promise<{ id: string; slug: string; name: string }> {
  if (_workspaceIdCache) return _workspaceIdCache;
  const [ws] = await db
    .select({ id: workspaces.id, slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  _workspaceIdCache = ws;
  return ws;
}

// ─── Read: list ────────────────────────────────────────────────────

async function listClients(args: { status?: string; limit?: number }) {
  const ws = await getWorkspace();
  const conditions = [eq(clients.workspaceId, ws.id)];
  if (args.status) conditions.push(eq(clients.status, args.status as "active"));
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
      email: clients.email,
      status: clients.status,
      tags: clients.tags,
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.updatedAt))
    .limit(Math.min(args.limit ?? 20, 50));
  return { count: rows.length, clients: rows };
}

async function listProjects(args: {
  status?: string;
  clientId?: string;
  limit?: number;
}) {
  const ws = await getWorkspace();
  const conditions = [eq(projects.workspaceId, ws.id)];
  if (args.status)
    conditions.push(
      eq(projects.status, args.status as "draft" | "active" | "on_hold"),
    );
  if (args.clientId) conditions.push(eq(projects.clientId, args.clientId));
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt))
    .limit(Math.min(args.limit ?? 20, 50));
  return { count: rows.length, projects: rows };
}

async function listTasks(args: {
  status?: string;
  projectId?: string;
  assigneeId?: string;
  dueBefore?: string;
  limit?: number;
}) {
  const ws = await getWorkspace();
  const conditions = [eq(tasks.workspaceId, ws.id)];
  if (args.status) {
    const statuses = args.status.split(",").map((s) => s.trim());
    if (statuses.length === 1) {
      conditions.push(eq(tasks.status, statuses[0] as "todo"));
    } else {
      conditions.push(inArray(tasks.status, statuses as ("todo" | "in_progress" | "review" | "done")[]));
    }
  }
  if (args.projectId) conditions.push(eq(tasks.projectId, args.projectId));
  if (args.assigneeId) conditions.push(eq(tasks.assigneeId, args.assigneeId));
  if (args.dueBefore) conditions.push(lt(tasks.dueDate, args.dueBefore));

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(and(...conditions))
    .orderBy(tasks.dueDate)
    .limit(Math.min(args.limit ?? 20, 50));
  return { count: rows.length, tasks: rows };
}

async function listInvoices(args: { status?: string; limit?: number }) {
  const ws = await getWorkspace();
  const conditions = [eq(invoices.workspaceId, ws.id)];
  if (args.status) {
    const statuses = args.status.split(",").map((s) => s.trim());
    if (statuses.length === 1) {
      conditions.push(eq(invoices.status, statuses[0] as "draft"));
    } else {
      conditions.push(
        inArray(invoices.status, statuses as ("draft" | "sent" | "paid")[]),
      );
    }
  }
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      currency: invoices.currency,
      total: invoices.total,
      dueDate: invoices.dueDate,
      issueDate: invoices.issueDate,
      clientId: invoices.clientId,
    })
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.issueDate))
    .limit(Math.min(args.limit ?? 20, 50));
  const unpaidTotal = rows
    .filter((r: { status: string }) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((s: number, r: { total: unknown }) => s + Number(r.total ?? 0), 0);
  return { count: rows.length, unpaidTotal, invoices: rows };
}

async function getWorkspaceSummary() {
  const ws = await getWorkspace();
  const today = new Date().toISOString().slice(0, 10);

  const [clientStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${clients.status} = 'active')::int`,
    })
    .from(clients)
    .where(eq(clients.workspaceId, ws.id));

  const [projectStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${projects.status} = 'active')::int`,
    })
    .from(projects)
    .where(eq(projects.workspaceId, ws.id));

  const [taskStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${tasks.status} != 'done')::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < ${today} and ${tasks.status} != 'done')::int`,
    })
    .from(tasks)
    .where(eq(tasks.workspaceId, ws.id));

  const [invoiceStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unpaid: sql<number>`count(*) filter (where ${invoices.status} not in ('paid', 'cancelled'))::int`,
      unpaidAmount: sql<string>`coalesce(sum(case when ${invoices.status} not in ('paid', 'cancelled') then ${invoices.total}::numeric else 0 end), 0)::text`,
    })
    .from(invoices)
    .where(eq(invoices.workspaceId, ws.id));

  const [teamSize] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, ws.id));

  // Monthly expense totals (current month) by currency
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const expenseMonthRows = await db
    .select({
      currency: expenses.currency,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)::text`,
    })
    .from(expenses)
    .where(and(eq(expenses.workspaceId, ws.id), sql`${expenses.date} >= ${monthStartStr}`))
    .groupBy(expenses.currency);

  return {
    asOf: new Date().toISOString(),
    workspace: { id: ws.id, name: ws.name },
    clients: clientStats,
    projects: projectStats,
    tasks: taskStats,
    invoices: invoiceStats,
    teamSize: teamSize.count,
    expensesThisMonth: expenseMonthRows,
  };
}

async function listWorkspaceMembers() {
  const ws = await getWorkspace();
  const rows = await db
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, ws.id));
  return { count: rows.length, members: rows };
}

// ─── Read: search (semantic via pg_trgm) ────────────────────

type SearchHit = {
  kind: "client" | "project" | "task" | "invoice";
  id: string;
  title: string;
  subtitle: string | null;
  similarity: number;
  status?: string | null;
};

async function searchWorkspace(
  args: { q: string; limit?: number; kinds?: string[] },
): Promise<{ query: string; count: number; results: SearchHit[] }> {
  const ws = await getWorkspace();
  const q = (args.q ?? "").trim();
  const limit = Math.min(args.limit ?? 10, 30);
  const allowedKinds = new Set((args.kinds ?? ["client", "project", "task", "invoice"]));
  if (!q) return { query: "", count: 0, results: [] };

  // Use trigram similarity (case-insensitive). Threshold 0.15 catches
  // typos and partial matches; higher = stricter.
  const results: SearchHit[] = [];

  if (allowedKinds.has("client")) {
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.companyName,
        status: clients.status,
        sim: sql<number>`similarity(${clients.name}, ${q})`,
      })
      .from(clients)
      .where(
        and(
          eq(clients.workspaceId, ws.id),
          sql`${clients.name} % ${q}`,
        ),
      )
      .orderBy(sql`similarity(${clients.name}, ${q}) desc`)
      .limit(limit);
    for (const r of rows) {
      results.push({
        kind: "client",
        id: r.id,
        title: r.name,
        subtitle: r.company,
        similarity: Number(r.sim),
        status: r.status,
      });
    }
  }

  if (allowedKinds.has("project")) {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        sim: sql<number>`similarity(${projects.name}, ${q})`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          sql`${projects.name} % ${q}`,
        ),
      )
      .orderBy(sql`similarity(${projects.name}, ${q}) desc`)
      .limit(limit);
    for (const r of rows) {
      results.push({
        kind: "project",
        id: r.id,
        title: r.name,
        subtitle: null,
        similarity: Number(r.sim),
        status: r.status,
      });
    }
  }

  if (allowedKinds.has("task")) {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        sim: sql<number>`similarity(${tasks.title}, ${q})`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, ws.id),
          sql`${tasks.title} % ${q}`,
        ),
      )
      .orderBy(sql`similarity(${tasks.title}, ${q}) desc`)
      .limit(limit);
    for (const r of rows) {
      results.push({
        kind: "task",
        id: r.id,
        title: r.title,
        subtitle: null,
        similarity: Number(r.sim),
        status: r.status,
      });
    }
  }

  if (allowedKinds.has("invoice")) {
    const rows = await db
      .select({
        id: invoices.id,
        number: invoices.invoiceNumber,
        status: invoices.status,
        sim: sql<number>`similarity(${invoices.invoiceNumber}, ${q})`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.workspaceId, ws.id),
          sql`${invoices.invoiceNumber} % ${q}`,
        ),
      )
      .orderBy(sql`similarity(${invoices.invoiceNumber}, ${q}) desc`)
      .limit(limit);
    for (const r of rows) {
      results.push({
        kind: "invoice",
        id: r.id,
        title: r.number,
        subtitle: null,
        similarity: Number(r.sim),
        status: r.status,
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return { query: q, count: results.length, results: results.slice(0, limit) };
}

// ─── Read: prompt library ────────────────────────────────────

async function listPrompts(args: { category?: string; limit?: number }) {
  const ws = await getWorkspace();
  const limit = Math.min(args.limit ?? 20, 50);
  const conds = [eq(promptTemplates.workspaceId, ws.id)];
  if (args.category) conds.push(eq(promptTemplates.category, args.category));
  const rows = await db
    .select({
      id: promptTemplates.id,
      name: promptTemplates.name,
      category: promptTemplates.category,
      description: promptTemplates.description,
      isSystem: promptTemplates.isSystem,
    })
    .from(promptTemplates)
    .where(and(...conds))
    .orderBy(desc(promptTemplates.createdAt))
    .limit(limit);
  return { count: rows.length, prompts: rows };
}

async function getPrompt(args: { id?: string; name?: string; category?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.name) {
    return { error: "Provide id or name" };
  }
  const conds = [eq(promptTemplates.workspaceId, ws.id)];
  if (args.id) conds.push(eq(promptTemplates.id, args.id));
  if (args.name) {
    if (args.category) conds.push(eq(promptTemplates.category, args.category));
    conds.push(sql`${promptTemplates.name} ILIKE ${"%" + args.name + "%"}`);
  }
  const [row] = await db
    .select()
    .from(promptTemplates)
    .where(and(...conds))
    .limit(1);
  if (!row) return { found: false };
  return {
    found: true,
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    template: row.template,
  };
}

// ─── Read: entity (single) ─────────────────────────────────────────

async function getClient(args: { id?: string; name?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.name) {
    return { error: "Provide either id or name" };
  }
  const conditions = [eq(clients.workspaceId, ws.id)];
  if (args.id) conditions.push(eq(clients.id, args.id));
  // Naive name match — case-insensitive contains. For "Kopi Senja" → matches.
  if (!args.id && args.name) {
    conditions.push(sql`${clients.name} ILIKE ${"%" + args.name + "%"}`);
  }
  const [row] = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
      email: clients.email,
      phone: clients.phone,
      website: clients.website,
      address: clients.address,
      status: clients.status,
      tags: clients.tags,
      internalNotes: clients.internalNotes,
      portalEnabled: clients.portalEnabled,
    })
    .from(clients)
    .where(and(...conditions))
    .limit(1);
  if (!row) return { found: false };
  // Also include recent projects + open invoices for context
  const recentProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
    })
    .from(projects)
    .where(eq(projects.clientId, row.id))
    .orderBy(desc(projects.updatedAt))
    .limit(5);
  const openInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, row.id),
        sql`${invoices.status} not in ('paid', 'cancelled')`,
      ),
    )
    .limit(10);
  return { found: true, client: row, recentProjects, openInvoices };
}

async function getProject(args: { id?: string; name?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.name) return { error: "Provide either id or name" };
  const conditions = [eq(projects.workspaceId, ws.id)];
  if (args.id) conditions.push(eq(projects.id, args.id));
  if (!args.id && args.name) {
    conditions.push(sql`${projects.name} ILIKE ${"%" + args.name + "%"}`);
  }
  const [row] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(and(...conditions))
    .limit(1);
  if (!row) return { found: false };
  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, row.clientId))
    .limit(1);
  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(eq(tasks.projectId, row.id))
    .orderBy(tasks.dueDate)
    .limit(20);
  return { found: true, project: row, client, tasks: projectTasks };
}

async function getTask(args: { id?: string; title?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.title) return { error: "Provide either id or title" };
  const conditions = [eq(tasks.workspaceId, ws.id)];
  if (args.id) conditions.push(eq(tasks.id, args.id));
  if (!args.id && args.title) {
    conditions.push(sql`${tasks.title} ILIKE ${"%" + args.title + "%"}`);
  }
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(and(...conditions))
    .limit(1);
  if (!row) return { found: false };
  const [project] = await db
    .select({ name: projects.name, clientId: projects.clientId })
    .from(projects)
    .where(eq(projects.id, row.projectId))
    .limit(1);
  const [assignee] = row.assigneeId
    ? await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, row.assigneeId))
        .limit(1)
    : [];
  return { found: true, task: row, project, assignee };
}

async function getInvoice(args: { id?: string; number?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.number) return { error: "Provide either id or number" };
  const conditions = [eq(invoices.workspaceId, ws.id)];
  if (args.id) conditions.push(eq(invoices.id, args.id));
  if (!args.id && args.number) {
    conditions.push(eq(invoices.invoiceNumber, args.number));
  }
  const [row] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      currency: invoices.currency,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      terms: invoices.terms,
      clientId: invoices.clientId,
    })
    .from(invoices)
    .where(and(...conditions))
    .limit(1);
  if (!row) return { found: false };
  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, row.clientId))
    .limit(1);
  // Items
  const items = await db
    .select({
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      amount: invoiceItems.amount,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, row.id));
  // Payments
  const pmts = await db
    .select({
      amount: payments.amount,
      paidAt: payments.paidAt,
      method: payments.method,
    })
    .from(payments)
    .where(eq(payments.invoiceId, row.id))
    .orderBy(desc(payments.paidAt));
  return { found: true, invoice: row, client, items, payments: pmts };
}

// ─── Action: requires user confirmation ───────────────────────────

async function updateTaskStatus(args: {
  taskId: string;
  newStatus: "todo" | "in_progress" | "review" | "done";
  reason?: string;
}) {
  const ws = await getWorkspace();
  // Verify task belongs to workspace
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      workspaceId: tasks.workspaceId,
    })
    .from(tasks)
    .where(eq(tasks.id, args.taskId))
    .limit(1);
  if (!task || task.workspaceId !== ws.id) {
    return { error: "Task not found in this workspace" };
  }
  if (task.status === args.newStatus) {
    return { confirmation: null, message: `Already ${args.newStatus}, no change` };
  }
  // Return a confirmation payload — UI shows "Confirm?" card
  return {
    confirmation: {
      kind: "update_task_status" as const,
      taskId: task.id,
      taskTitle: task.title,
      currentStatus: task.status,
      newStatus: args.newStatus,
      reason: args.reason ?? null,
    },
  };
}

async function draftInvoiceReminder(args: { invoiceId: string }) {
  const ws = await getWorkspace();
  const [inv] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      workspaceId: invoices.workspaceId,
      clientId: invoices.clientId,
    })
    .from(invoices)
    .where(eq(invoices.id, args.invoiceId))
    .limit(1);
  if (!inv || inv.workspaceId !== ws.id) {
    return { error: "Invoice not found in this workspace" };
  }
  if (inv.status === "paid" || inv.status === "cancelled") {
    return { error: `Invoice is ${inv.status}, no need to chase` };
  }
  const [client] = await db
    .select({ name: clients.name, email: clients.email, contactName: clients.name })
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  const due = inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "—";
  const subject = `Friendly reminder: ${inv.invoiceNumber} (${inv.currency} ${Number(inv.total).toLocaleString()})`;
  const body = [
    `Hi ${client?.name ?? "there"},`,
    ``,
    `Just a quick note that invoice ${inv.invoiceNumber} for ${inv.currency} ${Number(inv.total).toLocaleString()} is due ${due}.`,
    `If payment is already on its way, please ignore this. Otherwise, let me know if there's anything I can help with.`,
    ``,
    `Thanks!`,
  ].join("\n");
  return {
    confirmation: {
      kind: "draft_invoice_reminder" as const,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      to: client?.email ?? null,
      subject,
      body,
    },
  };
}

// ─── Read: finance (Sprint H) ─────────────────────────────────────

async function listExpenses(args: { categoryId?: string; projectId?: string; limit?: number; fromDate?: string; toDate?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(expenses.workspaceId, ws.id)];
  if (args.categoryId) conds.push(eq(expenses.categoryId, args.categoryId));
  if (args.projectId) conds.push(eq(expenses.projectId, args.projectId));
  if (args.fromDate) conds.push(sql`${expenses.date} >= ${args.fromDate}`);
  if (args.toDate) conds.push(sql`${expenses.date} <= ${args.toDate}`);
  const limit = Math.min(args.limit ?? 50, 200);
  const rows = await db
    .select({
      id: expenses.id,
      date: expenses.date,
      amount: expenses.amount,
      currency: expenses.currency,
      description: expenses.description,
      vendor: expenses.vendor,
      categoryName: expenseCategories.name,
      projectName: projects.name,
      clientName: clients.name,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(clients, eq(clients.id, expenses.clientId))
    .where(and(...conds))
    .orderBy(desc(expenses.date))
    .limit(limit);
  return { count: rows.length, expenses: rows };
}

async function expenseSummary(args: { fromDate?: string; toDate?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(expenses.workspaceId, ws.id)];
  if (args.fromDate) conds.push(sql`${expenses.date} >= ${args.fromDate}`);
  if (args.toDate) conds.push(sql`${expenses.date} <= ${args.toDate}`);
  // Totals by currency
  const totals = await db
    .select({
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(and(...conds))
    .groupBy(expenses.currency);
  // By category (IDR only for share calc)
  const byCategory = await db
    .select({
      categoryName: expenseCategories.name,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(and(...conds))
    .groupBy(expenseCategories.name, expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amount})`));
  return { totals, byCategory };
}

async function monthlyPL(args: { months?: number }) {
  const ws = await getWorkspace();
  const monthCount = Math.min(args.months ?? 6, 24);
  // Income from paid invoices by month (use payments.paidAt)
  const incomeRows = await db
    .select({
      month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
      total: sql<string>`sum(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(invoices.workspaceId, ws.id))
    .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`);
  // Expense by month by currency
  const expenseRows = await db
    .select({
      month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .where(eq(expenses.workspaceId, ws.id))
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`, expenses.currency)
    .orderBy(sql`to_char(${expenses.date}, 'YYYY-MM')`);
  // Merge by month (last N months from current)
  const months: string[] = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const incomeByMonth: Record<string, number> = {};
  incomeRows.forEach((r) => { incomeByMonth[r.month] = parseFloat(r.total ?? "0"); });
  const expensesByMonth: Record<string, Record<string, number>> = {};
  expenseRows.forEach((r) => {
    if (!expensesByMonth[r.month]) expensesByMonth[r.month] = {};
    expensesByMonth[r.month][r.currency] = parseFloat(r.total ?? "0");
  });
  const pl = months.map((m) => ({
    month: m,
    income: incomeByMonth[m] ?? 0,
    expenses: expensesByMonth[m] ?? {},
  }));
  return { months: pl };
}

async function projectPL(args: { projectId?: string; projectName?: string }) {
  const ws = await getWorkspace();
  if (!args.projectId && !args.projectName) {
    return { error: "Provide projectId or projectName" };
  }
  let projectId = args.projectId;
  if (!projectId && args.projectName) {
    const [p] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.workspaceId, ws.id), sql`${projects.name} ILIKE ${"%" + args.projectName + "%"}`))
      .limit(1);
    if (!p) return { error: `No project matching "${args.projectName}"` };
    projectId = p.id;
  }
  // Expenses tagged to this project (income: invoice has no projectId,
  // so we sum invoices for the project's client as a proxy)
  const expenseRows = await db
    .select({
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(and(eq(expenses.workspaceId, ws.id), eq(expenses.projectId, projectId!)));
  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      clientId: projects.clientId,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId!))
    .limit(1);
  // Income from paid invoices for the project's client (proxy)
  const incomeRows = proj?.clientId
    ? await db
        .select({
          total: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
          count: sql<number>`count(distinct ${invoices.id})::int`,
        })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .where(and(eq(invoices.workspaceId, ws.id), eq(invoices.clientId, proj.clientId)))
    : [{ total: "0", count: 0 }];
  const exp = parseFloat(expenseRows[0]?.total ?? "0");
  const income = parseFloat(incomeRows[0]?.total ?? "0");
  return {
    project: proj,
    incomeFromClient: income, // proxy: invoice schema lacks projectId
    expensesTagged: exp,
    net: income - exp,
    expenseCount: expenseRows[0]?.count ?? 0,
    note: "Income is aggregated from all paid invoices for this project's client (invoices have no projectId).",
  };
}

async function clientRevenue(args: { limit?: number; fromDate?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(invoices.workspaceId, ws.id)];
  if (args.fromDate) conds.push(sql`${invoices.issueDate} >= ${args.fromDate}`);
  // Aggregate by client: total invoiced, total paid, total unpaid
  const rows = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      totalInvoiced: sql<string>`coalesce(sum(${invoices.total}), 0)::text`,
      totalPaid: sql<string>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.total} else 0 end), 0)::text`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(...conds))
    .groupBy(clients.id, clients.name)
    .orderBy(desc(sql`sum(${invoices.total})`))
    .limit(Math.min(args.limit ?? 10, 50));
  return {
    count: rows.length,
    clients: rows.map((r) => ({
      ...r,
      totalUnpaid: (parseFloat(r.totalInvoiced) - parseFloat(r.totalPaid)).toFixed(2),
    })),
  };
}

async function invoiceAging() {
  const ws = await getWorkspace();
  const today = new Date().toISOString().slice(0, 10);
  // All unpaid invoices with dueDate
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientName: clients.name,
      total: invoices.total,
      dueDate: invoices.dueDate,
      status: invoices.status,
      daysOverdue: sql<number>`case when ${invoices.dueDate} < ${today}::date then (${today}::date - ${invoices.dueDate})::int else 0 end`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(
      eq(invoices.workspaceId, ws.id),
      sql`${invoices.status} not in ('paid', 'cancelled')`,
    ))
    .orderBy(invoices.dueDate);
  // Bucket
  const buckets = { current: { count: 0, total: 0 }, days_0_30: { count: 0, total: 0 }, days_31_60: { count: 0, total: 0 }, days_61_90: { count: 0, total: 0 }, days_90_plus: { count: 0, total: 0 } };
  const items: Array<{ invoiceNumber: string; client: string; total: string; dueDate: string; daysOverdue: number; status: string }> = [];
  for (const r of rows) {
    const total = parseFloat(r.total);
    const od = r.daysOverdue ?? 0;
    if (od === 0 || r.dueDate === null) {
      buckets.current.count += 1;
      buckets.current.total += total;
    } else if (od <= 30) {
      buckets.days_0_30.count += 1;
      buckets.days_0_30.total += total;
    } else if (od <= 60) {
      buckets.days_31_60.count += 1;
      buckets.days_31_60.total += total;
    } else if (od <= 90) {
      buckets.days_61_90.count += 1;
      buckets.days_61_90.total += total;
    } else {
      buckets.days_90_plus.count += 1;
      buckets.days_90_plus.total += total;
    }
    if (od > 0) {
      items.push({
        invoiceNumber: r.invoiceNumber,
        client: r.clientName,
        total: r.total,
        dueDate: r.dueDate ?? "",
        daysOverdue: od,
        status: r.status,
      });
    }
  }
  return {
    totalUnpaid: rows.length,
    totalUnpaidAmount: rows.reduce((s, r) => s + parseFloat(r.total), 0).toFixed(2),
    buckets,
    overdueItems: items.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
  };
}

async function topExpenseCategories(args: { limit?: number; fromDate?: string; toDate?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(expenses.workspaceId, ws.id)];
  if (args.fromDate) conds.push(sql`${expenses.date} >= ${args.fromDate}`);
  if (args.toDate) conds.push(sql`${expenses.date} <= ${args.toDate}`);
  const rows = await db
    .select({
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(and(...conds))
    .groupBy(expenseCategories.name, expenseCategories.color, expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amount})`))
    .limit(Math.min(args.limit ?? 10, 30));
  return { count: rows.length, categories: rows };
}

// ─── Read: pre-deal proposals (Sprint J — P2.7 phase 1) ───

async function listProposals(args: { status?: string; limit?: number; clientId?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(proposals.workspaceId, ws.id)];
  if (args.status) conds.push(eq(proposals.status, args.status as "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired"));
  if (args.clientId) conds.push(eq(proposals.clientId, args.clientId));
  const limit = Math.min(args.limit ?? 20, 100);
  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      total: proposals.total,
      currency: proposals.currency,
      downPaymentPercent: proposals.downPaymentPercent,
      sentAt: proposals.sentAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      createdAt: proposals.createdAt,
      clientName: clients.name,
    })
    .from(proposals)
    .leftJoin(clients, eq(clients.id, proposals.clientId))
    .where(and(...conds))
    .orderBy(desc(proposals.createdAt))
    .limit(limit);
  return { count: rows.length, proposals: rows };
}

async function getProposal(args: { id?: string; title?: string }) {
  const ws = await getWorkspace();
  if (!args.id && !args.title) return { error: "Provide id or title" };
  const conds = [eq(proposals.workspaceId, ws.id)];
  if (args.id) conds.push(eq(proposals.id, args.id));
  if (args.title) conds.push(sql`${proposals.title} ILIKE ${"%" + args.title + "%"}`);
  const [row] = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      body: proposals.body,
      lineItems: proposals.lineItems,
      subtotal: proposals.subtotal,
      tax: proposals.tax,
      total: proposals.total,
      currency: proposals.currency,
      downPaymentPercent: proposals.downPaymentPercent,
      validUntil: proposals.validUntil,
      status: proposals.status,
      sentAt: proposals.sentAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      declineReason: proposals.declineReason,
      projectId: proposals.projectId,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(proposals)
    .leftJoin(clients, eq(clients.id, proposals.clientId))
    .where(and(...conds))
    .limit(1);
  if (!row) return { error: "Not found" };
  return row;
}

// ─── Read: contracts (Sprint M — P2.7.3) ───

async function listContracts(args: { status?: string; limit?: number; clientId?: string }) {
  const ws = await getWorkspace();
  const conds = [eq(contracts.workspaceId, ws.id)];
  if (args.status) conds.push(eq(contracts.status, args.status as "draft" | "sent" | "viewed" | "signed" | "declined" | "expired" | "revoked"));
  if (args.clientId) conds.push(eq(contracts.clientId, args.clientId));
  const limit = Math.min(args.limit ?? 20, 100);
  const rows = await db
    .select({
      id: contracts.id,
      title: contracts.title,
      status: contracts.status,
      validUntil: contracts.validUntil,
      sentAt: contracts.sentAt,
      signedAt: contracts.signedAt,
      declinedAt: contracts.declinedAt,
      createdAt: contracts.createdAt,
      clientId: contracts.clientId,
      clientName: clients.name,
      signedName: contracts.signedName,
    })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(...conds))
    .orderBy(desc(contracts.createdAt))
    .limit(limit);
  return rows;
}

async function getContract(args: { contractId?: string; title?: string }) {
  const ws = await getWorkspace();
  if (!args.contractId && !args.title) return { error: "Provide contractId or title" };
  const conds = [eq(contracts.workspaceId, ws.id)];
  if (args.contractId) conds.push(eq(contracts.id, args.contractId));
  if (args.title) conds.push(sql`${contracts.title} ILIKE ${"%" + args.title + "%"}`);
  const [row] = await db
    .select({
      id: contracts.id,
      title: contracts.title,
      body: contracts.body,
      bodyResolved: contracts.bodyResolved,
      status: contracts.status,
      validUntil: contracts.validUntil,
      sentAt: contracts.sentAt,
      viewedAt: contracts.viewedAt,
      signedAt: contracts.signedAt,
      declinedAt: contracts.declinedAt,
      signedName: contracts.signedName,
      signedEmail: contracts.signedEmail,
      signedFromIp: contracts.signedFromIp,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(contracts)
    .leftJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(...conds))
    .limit(1);
  if (!row) return { error: "Not found" };
  return row;
}

// ─── Read: questionnaires (Sprint N — P2.7.2 AI tools) ───

async function listQuestionnaires(args: { limit?: number }) {
  const ws = await getWorkspace();
  const limit = Math.min(args.limit ?? 20, 100);
  const rows = await db
    .select({
      id: questionnaires.id,
      name: questionnaires.name,
      description: questionnaires.description,
      schema: questionnaires.schema,
      createdAt: questionnaires.createdAt,
    })
    .from(questionnaires)
    .where(eq(questionnaires.workspaceId, ws.id))
    .orderBy(desc(questionnaires.createdAt))
    .limit(limit);
  return rows.map(r => ({
    ...r,
    fieldCount: Array.isArray(r.schema) ? (r.schema as unknown[]).length : 0,
  }));
}

async function listQuestionnaireResponses(args: { questionnaireId: string; status?: string; limit?: number }) {
  const ws = await getWorkspace();
  const conds = [
    eq(questionnaireResponses.workspaceId, ws.id),
    eq(questionnaireResponses.questionnaireId, args.questionnaireId),
  ];
  if (args.status) conds.push(eq(questionnaireResponses.status, args.status as "pending" | "submitted"));
  const limit = Math.min(args.limit ?? 20, 100);
  const rows = await db
    .select({
      id: questionnaireResponses.id,
      respondentName: questionnaireResponses.respondentName,
      respondentEmail: questionnaireResponses.respondentEmail,
      status: questionnaireResponses.status,
      answers: questionnaireResponses.answers,
      submittedAt: questionnaireResponses.submittedAt,
      createdAt: questionnaireResponses.createdAt,
      clientName: clients.name,
    })
    .from(questionnaireResponses)
    .leftJoin(clients, eq(clients.id, questionnaireResponses.clientId))
    .where(and(...conds))
    .orderBy(desc(questionnaireResponses.createdAt))
    .limit(limit);
  return rows;
}

async function getQuestionnaireResponse(args: { responseId: string }) {
  const ws = await getWorkspace();
  const [row] = await db
    .select({
      id: questionnaireResponses.id,
      respondentName: questionnaireResponses.respondentName,
      respondentEmail: questionnaireResponses.respondentEmail,
      status: questionnaireResponses.status,
      answers: questionnaireResponses.answers,
      submittedAt: questionnaireResponses.submittedAt,
      createdAt: questionnaireResponses.createdAt,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(questionnaireResponses)
    .leftJoin(clients, eq(clients.id, questionnaireResponses.clientId))
    .leftJoin(projects, eq(projects.id, questionnaireResponses.projectId))
    .where(and(
      eq(questionnaireResponses.id, args.responseId),
      eq(questionnaireResponses.workspaceId, ws.id),
    ))
    .limit(1);
  if (!row) return { error: "Not found" };
  return row;
}

// ─── Read: cash flow + recurring (Sprint K — P2.8 phase 3) ───

async function cashFlowForecast(args: { months?: number }) {
  const ws = await getWorkspace();
  const monthCount = Math.min(args.months ?? 3, 12);
  // Upcoming income: unpaid invoices with dueDate in the next N months
  const today = new Date().toISOString().slice(0, 10);
  const futureLimit = new Date();
  futureLimit.setMonth(futureLimit.getMonth() + monthCount);
  const futureLimitStr = futureLimit.toISOString().slice(0, 10);

  const upcomingRows = await db
    .select({
      month: sql<string>`to_char(${invoices.dueDate}, 'YYYY-MM')`,
      total: sql<string>`sum(${invoices.total})`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(and(
      eq(invoices.workspaceId, ws.id),
      sql`${invoices.status} not in ('paid', 'cancelled')`,
      sql`${invoices.dueDate} is not null`,
      gte(invoices.dueDate, today),
      lte(invoices.dueDate, futureLimitStr),
    ))
    .groupBy(sql`to_char(${invoices.dueDate}, 'YYYY-MM')`);

  // Recurring expenses by month
  const recurringRows = await db
    .select()
    .from(expenseRecurring)
    .where(and(eq(expenseRecurring.workspaceId, ws.id), eq(expenseRecurring.isActive, true)));

  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const incomeByMonth: Record<string, { total: number; count: number }> = {};
  upcomingRows.forEach((r) => {
    incomeByMonth[r.month] = { total: parseFloat(r.total ?? "0"), count: Number(r.count ?? 0) };
  });

  // For each month, project recurring expenses (assume monthly/quarterly/yearly)
  const forecast = months.map((m, idx) => {
    let recurringTotal: Record<string, number> = {};
    for (const r of recurringRows) {
      const startMonth = r.startDate.slice(0, 7);
      const endMonth = r.endDate ? r.endDate.slice(0, 7) : null;
      if (startMonth > m) continue;
      if (endMonth && endMonth < m) continue;
      const monthsDiff = (new Date(m + "-01").getFullYear() - new Date(startMonth + "-01").getFullYear()) * 12 +
        (new Date(m + "-01").getMonth() - new Date(startMonth + "-01").getMonth());
      if (r.frequency === "monthly" && monthsDiff >= 0) {
        recurringTotal[r.currency] = (recurringTotal[r.currency] ?? 0) + parseFloat(r.amount);
      } else if (r.frequency === "quarterly" && monthsDiff >= 0 && monthsDiff % 3 === 0) {
        recurringTotal[r.currency] = (recurringTotal[r.currency] ?? 0) + parseFloat(r.amount);
      } else if (r.frequency === "yearly" && monthsDiff >= 0 && monthsDiff % 12 === 0) {
        recurringTotal[r.currency] = (recurringTotal[r.currency] ?? 0) + parseFloat(r.amount);
      }
    }
    return {
      month: m,
      expectedIncome: incomeByMonth[m] ?? { total: 0, count: 0 },
      recurringExpenses: recurringTotal,
    };
  });

  return { months: forecast, recurringCount: recurringRows.length };
}

async function listRecurring(args: { isActive?: boolean; limit?: number }) {
  const ws = await getWorkspace();
  const conds = [eq(expenseRecurring.workspaceId, ws.id)];
  if (args.isActive !== undefined) conds.push(eq(expenseRecurring.isActive, args.isActive));
  const limit = Math.min(args.limit ?? 30, 100);
  const rows = await db
    .select({
      id: expenseRecurring.id,
      name: expenseRecurring.name,
      amount: expenseRecurring.amount,
      currency: expenseRecurring.currency,
      frequency: expenseRecurring.frequency,
      startDate: expenseRecurring.startDate,
      endDate: expenseRecurring.endDate,
      lastGeneratedDate: expenseRecurring.lastGeneratedDate,
      isActive: expenseRecurring.isActive,
      categoryName: expenseCategories.name,
      projectName: projects.name,
    })
    .from(expenseRecurring)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenseRecurring.categoryId))
    .leftJoin(projects, eq(projects.id, expenseRecurring.projectId))
    .where(and(...conds))
    .limit(limit);
  return { count: rows.length, recurring: rows };
}

// ─── Tool registry ─────────────────────────────────────────────────

export const TOOL_DEFS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_clients",
      description:
        "List workspace clients. Returns name, company, email, status, tags.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "archived"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List workspace projects. Use for project-level questions.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "active", "on_hold", "completed", "cancelled"],
          },
          clientId: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List workspace tasks. Use for 'what's pending', 'overdue', 'my tasks' etc.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Comma-separated. Valid: todo,in_progress,review,done",
          },
          projectId: { type: "string" },
          assigneeId: { type: "string", description: "User UUID" },
          dueBefore: { type: "string", description: "ISO date YYYY-MM-DD" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_invoices",
      description: "List workspace invoices. Use for billing/outstanding/paid questions.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Comma-separated. Valid: draft,sent,viewed,paid,overdue,cancelled. Try 'sent,viewed,overdue' for unpaid.",
          },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workspace_summary",
      description: "High-level workspace metrics. Use for 'how is the business doing', 'summary'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_workspace_members",
      description: "List team members with role, name, email. Use for 'who's on the team', 'find user <name>'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_workspace",
      description:
        "Fuzzy search across clients, projects, tasks, and invoices by name/title. Returns ranked matches with similarity scores. Use when the user says 'find anything about X', 'search for X', or you don't know the exact name.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query (partial match OK, typo-tolerant)" },
          limit: { type: "number", description: "Max total results, default 10, max 30" },
          kinds: {
            type: "array",
            items: { type: "string", enum: ["client", "project", "task", "invoice"] },
            description: "Filter by entity kind. Omit to search all.",
          },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_prompts",
      description:
        "List prompt templates in the workspace. Use for 'what prompts do I have', 'show me the cold outreach templates'.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category (e.g. 'outreach', 'proposal')" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_prompt",
      description:
        "Fetch a prompt template by id or partial name. Returns the full template body so you can use it.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Prompt UUID" },
          name: { type: "string", description: "Prompt name (partial match OK)" },
          category: { type: "string", description: "Optional category to disambiguate" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_expenses",
      description:
        "List expenses in the workspace. Use for 'show my expenses', 'what did I spend on software', 'recent expenses'.",
      parameters: {
        type: "object",
        properties: {
          categoryId: { type: "string", description: "Filter by category UUID" },
          projectId: { type: "string", description: "Filter by project UUID" },
          fromDate: { type: "string", description: "YYYY-MM-DD start" },
          toDate: { type: "string", description: "YYYY-MM-DD end" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "expense_summary",
      description:
        "Aggregate expenses by currency and category. Use for 'how much did I spend this month', 'where does my money go'.",
      parameters: {
        type: "object",
        properties: {
          fromDate: { type: "string", description: "YYYY-MM-DD" },
          toDate: { type: "string", description: "YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "monthly_pl",
      description:
        "Income vs expenses by month (last N months). Income auto-derived from paid invoices. Use for 'P&L', 'am I profitable', 'monthly trend'.",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "How many months back (default 6, max 24)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "project_pl",
      description:
        "Profit & loss for a single project: income (paid invoices), expenses tagged, net margin, unpaid invoices. Use for 'is project X profitable', 'project P&L'.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project UUID" },
          projectName: { type: "string", description: "Project name (partial match OK)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "client_revenue",
      description:
        "Top clients by revenue. Returns total invoiced, paid, unpaid per client. Use for 'which client pays most', 'top clients', 'revenue by client'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max clients (default 10, max 50)" },
          fromDate: { type: "string", description: "YYYY-MM-DD start" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invoice_aging",
      description:
        "Aging buckets for unpaid invoices: current, 0-30, 31-60, 61-90, 90+ days overdue. Use for 'who owes me money', 'overdue invoices', 'AR aging'.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_expense_categories",
      description:
        "Top spending categories sorted by total. Use for 'where does my money go', 'biggest expense categories', 'software spend'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max categories (default 10, max 30)" },
          fromDate: { type: "string", description: "YYYY-MM-DD start" },
          toDate: { type: "string", description: "YYYY-MM-DD end" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_proposals",
      description:
        "List proposals. Use for 'show open proposals', 'which proposals are pending', 'declined proposals'.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "sent", "viewed", "accepted", "declined", "expired"] },
          clientId: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_proposal",
      description:
        "Fetch a single proposal by id or partial title. Returns full line items, totals, status, accept/decline timestamps.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", description: "Partial title match" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cash_flow_forecast",
      description:
        "Forecast next N months: expected income (unpaid invoices with dueDate) + recurring expenses projected. Use for 'cash flow', 'can I pay next month', 'forecast'.",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "Months ahead (default 3, max 12)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recurring",
      description:
        "List recurring expense rules. Use for 'what recurring expenses do I have', 'subscriptions'.",
      parameters: {
        type: "object",
        properties: {
          isActive: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_contracts",
      description:
        "List contracts in the workspace. Filter by status (draft/sent/viewed/signed/declined/expired/revoked) or clientId. Use for 'what contracts do I have', 'pending signatures', 'signed contracts'.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "sent", "viewed", "signed", "declined", "expired", "revoked"] },
          clientId: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contract",
      description:
        "Get full contract details by contractId or title. Returns body, client, status, signature info if signed. Use for 'show me contract X', 'has the contract been signed'.",
      parameters: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          title: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_questionnaires",
      description:
        "List intake questionnaires defined in the workspace. Use for 'what questionnaires do I have', 'intake forms'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_questionnaire_responses",
      description:
        "List responses for a questionnaire. Returns respondent name/email, status (pending/submitted), submitted date, and answers summary. Use for 'who has filled out the intake', 'show me the responses'.",
      parameters: {
        type: "object",
        properties: {
          questionnaireId: { type: "string" },
          status: { type: "string", enum: ["pending", "submitted"] },
          limit: { type: "number" },
        },
        required: ["questionnaireId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_questionnaire_response",
      description:
        "Get full details of a single questionnaire response: respondent name/email, status, all answers. Use for 'show me response X', 'what did they answer'.",
      parameters: {
        type: "object",
        properties: {
          responseId: { type: "string" },
        },
        required: ["responseId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client",
      description: "Get one client by id or name. Returns contact info, recent projects, open invoices.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Client UUID" },
          name: { type: "string", description: "Client name (partial match OK)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description: "Get one project by id or name. Returns client, tasks. Use for drill-down.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "Project name (partial match OK)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_task",
      description: "Get one task by id or title. Returns project + assignee.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", description: "Task title (partial match OK)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoice",
      description: "Get one invoice by id or invoice number. Returns client, items, payments.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "string", description: "e.g. INV-0001" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description:
        "Change a task's status. Returns a confirmation payload — user must confirm in UI before the write happens.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          newStatus: {
            type: "string",
            enum: ["todo", "in_progress", "review", "done"],
          },
          reason: { type: "string" },
        },
        required: ["taskId", "newStatus"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_invoice_reminder",
      description:
        "Draft a payment reminder email for an unpaid invoice. Returns a confirmation payload (subject + body) — user must confirm in UI. Sending happens only after user clicks Send.",
      parameters: {
        type: "object",
        properties: {
          invoiceId: { type: "string" },
        },
        required: ["invoiceId"],
      },
    },
  },
];

export type ToolName =
  | "list_clients"
  | "list_projects"
  | "list_tasks"
  | "list_invoices"
  | "get_workspace_summary"
  | "list_workspace_members"
  | "search_workspace"
  | "list_prompts"
  | "get_prompt"
  | "list_expenses"
  | "expense_summary"
  | "monthly_pl"
  | "project_pl"
  | "client_revenue"
  | "invoice_aging"
  | "top_expense_categories"
  | "list_proposals"
  | "get_proposal"
  | "cash_flow_forecast"
  | "list_recurring"
  | "list_contracts"
  | "get_contract"
  | "list_questionnaires"
  | "list_questionnaire_responses"
  | "get_questionnaire_response"
  | "get_client"
  | "get_project"
  | "get_task"
  | "get_invoice"
  | "update_task_status"
  | "draft_invoice_reminder";

export const ACTION_TOOLS = new Set<string>([
  "update_task_status",
  "draft_invoice_reminder",
]);

export async function executeTool(
  name: string,
  argsJson: string,
): Promise<unknown> {
  const args = (argsJson ? JSON.parse(argsJson) : {}) as Record<string, unknown>;
  switch (name as ToolName) {
    case "list_clients":
      return listClients(args as { status?: string; limit?: number });
    case "list_projects":
      return listProjects(args as { status?: string; clientId?: string; limit?: number });
    case "list_tasks":
      return listTasks(args as { status?: string; projectId?: string; assigneeId?: string; dueBefore?: string; limit?: number });
    case "list_invoices":
      return listInvoices(args as { status?: string; limit?: number });
    case "get_workspace_summary":
      return getWorkspaceSummary();
    case "list_workspace_members":
      return listWorkspaceMembers();
    case "search_workspace":
      return searchWorkspace(args as { q: string; limit?: number; kinds?: string[] });
    case "list_prompts":
      return listPrompts(args as { category?: string; limit?: number });
    case "get_prompt":
      return getPrompt(args as { id?: string; name?: string; category?: string });
    case "list_expenses":
      return listExpenses(args as { categoryId?: string; projectId?: string; limit?: number; fromDate?: string; toDate?: string });
    case "expense_summary":
      return expenseSummary(args as { fromDate?: string; toDate?: string });
    case "monthly_pl":
      return monthlyPL(args as { months?: number });
    case "project_pl":
      return projectPL(args as { projectId?: string; projectName?: string });
    case "client_revenue":
      return clientRevenue(args as { limit?: number; fromDate?: string });
    case "invoice_aging":
      return invoiceAging();
    case "top_expense_categories":
      return topExpenseCategories(args as { limit?: number; fromDate?: string; toDate?: string });
    case "list_proposals":
      return listProposals(args as { status?: string; limit?: number; clientId?: string });
    case "get_proposal":
      return getProposal(args as { id?: string; title?: string });
    case "cash_flow_forecast":
      return cashFlowForecast(args as { months?: number });
    case "list_recurring":
      return listRecurring(args as { isActive?: boolean; limit?: number });
    case "list_contracts":
      return listContracts(args as { status?: string; limit?: number; clientId?: string });
    case "get_contract":
      return getContract(args as { contractId?: string; title?: string });
    case "list_questionnaires":
      return listQuestionnaires(args as { limit?: number });
    case "list_questionnaire_responses":
      return listQuestionnaireResponses(args as { questionnaireId: string; status?: string; limit?: number });
    case "get_questionnaire_response":
      return getQuestionnaireResponse(args as { responseId: string });
    case "get_client":
      return getClient(args as { id?: string; name?: string });
    case "get_project":
      return getProject(args as { id?: string; name?: string });
    case "get_task":
      return getTask(args as { id?: string; title?: string });
    case "get_invoice":
      return getInvoice(args as { id?: string; number?: string });
    case "update_task_status":
      return updateTaskStatus(
        args as { taskId: string; newStatus: "todo" | "in_progress" | "review" | "done"; reason?: string },
      );
    case "draft_invoice_reminder":
      return draftInvoiceReminder(args as { invoiceId: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
