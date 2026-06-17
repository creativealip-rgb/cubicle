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

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
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

  return {
    asOf: new Date().toISOString(),
    workspace: { id: ws.id, name: ws.name },
    clients: clientStats,
    projects: projectStats,
    tasks: taskStats,
    invoices: invoiceStats,
    teamSize: teamSize.count,
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
