/**
 * AI assistant tools (Phase 1 MVP).
 *
 * Five structured-query tools the assistant can call to retrieve
 * workspace data. Each tool returns a JSON-serializable object the
 * assistant can summarize for the user.
 *
 * Phase 2 idea: add embedding-based semantic search once 9router
 * exposes an /embeddings endpoint on this key.
 */

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  invoices,
  projects,
  tasks,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import type { ToolDefinition } from "./client";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

// ─── Tool implementations ──────────────────────────────────────────

async function listClients(args: { status?: string; limit?: number }) {
  const workspaceId = await getWorkspaceId();
  const conditions = [eq(clients.workspaceId, workspaceId)];
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
  const workspaceId = await getWorkspaceId();
  const conditions = [eq(projects.workspaceId, workspaceId)];
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
  const workspaceId = await getWorkspaceId();
  const conditions = [eq(tasks.workspaceId, workspaceId)];
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
  const workspaceId = await getWorkspaceId();
  const conditions = [eq(invoices.workspaceId, workspaceId)];
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
  // Sum totals
  const unpaidTotal = rows
    .filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((s, r) => s + Number(r.total ?? 0), 0);
  return { count: rows.length, unpaidTotal, invoices: rows };
}

async function getWorkspaceSummary() {
  const workspaceId = await getWorkspaceId();
  const today = new Date().toISOString().slice(0, 10);

  const [clientStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${clients.status} = 'active')::int`,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));

  const [projectStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${projects.status} = 'active')::int`,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  const [taskStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${tasks.status} != 'done')::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < ${today} and ${tasks.status} != 'done')::int`,
    })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId));

  const [invoiceStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unpaid: sql<number>`count(*) filter (where ${invoices.status} not in ('paid', 'cancelled'))::int`,
      unpaidAmount: sql<string>`coalesce(sum(case when ${invoices.status} not in ('paid', 'cancelled') then ${invoices.total}::numeric else 0 end), 0)::text`,
    })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId));

  const [teamSize] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return {
    asOf: new Date().toISOString(),
    clients: clientStats,
    projects: projectStats,
    tasks: taskStats,
    invoices: invoiceStats,
    teamSize: teamSize.count,
  };
}

// ─── Tool registry ─────────────────────────────────────────────────

export const TOOL_DEFS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_clients",
      description:
        "List workspace clients. Returns name, company, email, status, tags. Use when user asks about clients, customers, or contacts.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive", "archived"],
            description: "Filter by client status. Omit for all clients.",
          },
          limit: { type: "number", description: "Max results (default 20, max 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description:
        "List workspace projects. Returns name, status, due date. Use for project questions.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "active", "on_hold", "completed", "cancelled"],
          },
          clientId: { type: "string", description: "Filter by client UUID" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "List workspace tasks. Returns title, status, priority, due date, project, assignee. Use for 'what's pending', 'my tasks', 'overdue tasks' etc.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Comma-separated statuses. Valid: todo,in_progress,review,done. Omit for all.",
          },
          projectId: { type: "string" },
          assigneeId: {
            type: "string",
            description: "User UUID. Use 'me' style only if known — pass actual id.",
          },
          dueBefore: {
            type: "string",
            description: "ISO date (YYYY-MM-DD). Returns tasks due before this date.",
          },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_invoices",
      description:
        "List workspace invoices. Returns invoice number, status, total, due date. Use for billing, outstanding, paid questions.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Comma-separated. Valid: draft,sent,viewed,paid,overdue,cancelled. Try 'sent,viewed,overdue' for unpaid.",
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
      description:
        "High-level workspace metrics: client count, project count, open tasks, overdue tasks, unpaid invoice total, team size. Use for 'how is the business doing', 'summary', 'overview'.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export type ToolName =
  | "list_clients"
  | "list_projects"
  | "list_tasks"
  | "list_invoices"
  | "get_workspace_summary";

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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
