"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { supportTickets, users, clients, projects } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { z } from "zod";
import { writeActivityLog } from "@/lib/actions/activity";

const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z
    .enum([
      "features",
      "free_plan_pricing",
      "account",
      "workspace",
      "subscription",
      "billing",
      "security_privacy",
      "technical",
      "general",
    ])
    .default("features"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  screenshotUrl: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      "features",
      "free_plan_pricing",
      "account",
      "workspace",
      "subscription",
      "billing",
      "security_privacy",
      "technical",
      "general",
    ])
    .optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  screenshotUrl: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export async function createTicket(input: z.infer<typeof createTicketSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot create tickets");

  const parsed = createTicketSchema.parse(input);

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      workspaceId,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      priority: parsed.priority,
      screenshotUrl: parsed.screenshotUrl || null,
      assigneeId: parsed.assigneeId,
      clientId: parsed.clientId,
      projectId: parsed.projectId,
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "created_ticket", "support_ticket", ticket.id);
  return ticket;
}

export async function updateTicket(ticketId: string, input: z.infer<typeof updateTicketSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot update tickets");

  const parsed = updateTicketSchema.parse(input);

  const [ticket] = await db
    .update(supportTickets)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.workspaceId, workspaceId)))
    .returning();

  if (ticket) {
    const action = parsed.status ? `ticket_${parsed.status}` : "updated_ticket";
    await writeActivityLog(workspaceId, user.id, action, "support_ticket", ticketId);
  }

  return ticket;
}

export async function deleteTicket(ticketId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role !== "owner") throw new Error("Only owners can delete tickets");

  await db
    .delete(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.workspaceId, workspaceId)));

  await writeActivityLog(workspaceId, user.id, "deleted_ticket", "support_ticket", ticketId);
}

export async function listTickets() {
  const workspaceId = await getWorkspaceId();

  const tickets = await db
    .select({
      id: supportTickets.id,
      title: supportTickets.title,
      description: supportTickets.description,
      category: supportTickets.category,
      status: supportTickets.status,
      priority: supportTickets.priority,
      assigneeId: supportTickets.assigneeId,
      assigneeName: users.name,
      clientId: supportTickets.clientId,
      clientName: clients.name,
      projectId: supportTickets.projectId,
      projectName: projects.name,
      createdBy: supportTickets.createdBy,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.assigneeId))
    .leftJoin(clients, eq(clients.id, supportTickets.clientId))
    .leftJoin(projects, eq(projects.id, supportTickets.projectId))
    .where(eq(supportTickets.workspaceId, workspaceId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(200);

  return tickets;
}

export async function getTicketCounts() {
  const workspaceId = await getWorkspaceId();

  const counts = await db
    .select({ status: supportTickets.status, count: count() })
    .from(supportTickets)
    .where(eq(supportTickets.workspaceId, workspaceId))
    .groupBy(supportTickets.status);

  return counts;
}
