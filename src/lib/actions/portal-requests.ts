"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { portalRequests, projects } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

const createPortalRequestSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  type: z.enum(["document", "approval", "info", "other"]).default("document"),
  dueDate: z.string().optional().nullable(),
});

const completePortalRequestSchema = z.object({
  token: z.string().min(1),
  requestId: z.string().uuid(),
});

const respondPortalRequestSchema = z.object({
  token: z.string().min(1),
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
});

const completePortalRequestAdminSchema = z.object({
  requestId: z.string().uuid(),
});

const updatePortalRequestAdminSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["pending", "completed", "cancelled"]),
});

export async function createPortalRequest(input: z.infer<typeof createPortalRequestSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);
  const parsed = createPortalRequestSchema.parse(input);

  if (parsed.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    if (!project) throw new Error("Project not found");
  }

  const [row] = await db
    .insert(portalRequests)
    .values({
      workspaceId,
      clientId: parsed.clientId,
      projectId: parsed.projectId || null,
      title: parsed.title,
      description: parsed.description || null,
      type: parsed.type,
      dueDate: parsed.dueDate || null,
      createdBy: user.id,
    })
    .returning();

  revalidatePath("/app/clients");
  return row;
}

export async function updatePortalRequestAdmin(input: z.infer<typeof updatePortalRequestAdminSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);
  const parsed = updatePortalRequestAdminSchema.parse(input);

  const [request] = await db
    .select({ id: portalRequests.id })
    .from(portalRequests)
    .where(and(eq(portalRequests.id, parsed.requestId), eq(portalRequests.workspaceId, workspaceId)))
    .limit(1);

  if (!request) throw new Error("Request not found");

  const [row] = await db
    .update(portalRequests)
    .set({
      status: parsed.status,
      completedAt: parsed.status === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(portalRequests.id, parsed.requestId))
    .returning();

  revalidatePath("/app/clients");
  return row;
}

export async function completePortalRequestAdmin(input: z.infer<typeof completePortalRequestAdminSchema>) {
  const parsed = completePortalRequestAdminSchema.parse(input);
  return updatePortalRequestAdmin({ requestId: parsed.requestId, status: "completed" });
}

export async function completePortalRequest(input: z.infer<typeof completePortalRequestSchema>) {
  const parsed = completePortalRequestSchema.parse(input);
  const { getClientPortalAccess } = await import("@/lib/actions/portal");
  const client = await getClientPortalAccess(parsed.token);

  const [request] = await db
    .select({ id: portalRequests.id })
    .from(portalRequests)
    .where(
      and(
        eq(portalRequests.id, parsed.requestId),
        eq(portalRequests.clientId, client.id),
        eq(portalRequests.workspaceId, client.workspaceId),
      ),
    )
    .limit(1);

  if (!request) throw new Error("Request not found");

  const [row] = await db
    .update(portalRequests)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(portalRequests.id, parsed.requestId))
    .returning();

  return row;
}

/**
 * Client portal: approve / reject an approval-type request.
 * Stores decision in description trailer (no schema migration).
 */
export async function respondPortalRequest(input: z.infer<typeof respondPortalRequestSchema>) {
  const parsed = respondPortalRequestSchema.parse(input);
  const { getClientPortalAccess } = await import("@/lib/actions/portal");
  const client = await getClientPortalAccess(parsed.token);

  const [request] = await db
    .select({
      id: portalRequests.id,
      type: portalRequests.type,
      description: portalRequests.description,
      status: portalRequests.status,
    })
    .from(portalRequests)
    .where(
      and(
        eq(portalRequests.id, parsed.requestId),
        eq(portalRequests.clientId, client.id),
        eq(portalRequests.workspaceId, client.workspaceId),
      ),
    )
    .limit(1);

  if (!request) throw new Error("Request not found");
  if (request.status === "completed" || request.status === "cancelled") {
    throw new Error("Request already closed");
  }
  if (request.type !== "approval") {
    throw new Error("Only approval requests can be approved/rejected");
  }

  const stamp = new Date().toISOString();
  const decisionLabel = parsed.decision === "approved" ? "APPROVED" : "REJECTED";
  const noteLine = parsed.note?.trim() ? `\nClient note: ${parsed.note.trim()}` : "";
  const trailer = `\n\n---\n[Client ${decisionLabel} @ ${stamp}]${noteLine}`;
  const nextDescription = `${request.description || ""}${trailer}`.slice(0, 8000);

  const [row] = await db
    .update(portalRequests)
    .set({
      status: "completed",
      description: nextDescription,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(portalRequests.id, parsed.requestId))
    .returning();

  return { ...row, decision: parsed.decision };
}
