"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { comments, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

const createCommentSchema = z.object({
  entityType: z.enum(["project", "task", "file", "invoice"]),
  entityId: z.string().uuid(),
  body: z.string().min(1, "Comment cannot be empty"),
  visibility: z.enum(["internal", "client"]).default("internal"),
});

const createPortalCommentSchema = z.object({
  token: z.string().min(1),
  entityType: z.enum(["project", "task", "file", "invoice"]),
  entityId: z.string().uuid(),
  body: z.string().min(1, "Comment cannot be empty"),
  authorName: z.string().min(1, "Name is required"),
  authorEmail: z.string().email("Valid email required"),
});

export async function createComment(input: z.infer<typeof createCommentSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const parsed = createCommentSchema.parse(input);

  // Get user info for author fields
  const { users } = await import("@/db/schema");
  const [dbUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const [comment] = await db.insert(comments).values({
    workspaceId,
    entityType: parsed.entityType,
    entityId: parsed.entityId,
    body: parsed.body,
    visibility: parsed.visibility,
    authorId: user.id,
    authorName: dbUser?.name ?? null,
    authorEmail: dbUser?.email ?? null,
    source: "internal",
  }).returning();

  await writeActivityLog(workspaceId, user.id, "created_comment", "comment", comment.id, {
    entityType: parsed.entityType,
    entityId: parsed.entityId,
  });
  return comment;
}

export async function createPortalComment(input: z.infer<typeof createPortalCommentSchema>) {
  const parsed = createPortalCommentSchema.parse(input);

  // Find workspace via entity
  const _entityTable = parsed.entityType === "project" ? workspaces : null;
  // For portal comments, resolve workspace from the entity
  let wsId = "";
  if (parsed.entityType === "project") {
    const { projects } = await import("@/db/schema");
    const [proj] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, parsed.entityId))
      .limit(1);
    wsId = proj?.workspaceId ?? "";
  } else if (parsed.entityType === "task") {
    const { tasks } = await import("@/db/schema");
    const [task] = await db
      .select({ workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(eq(tasks.id, parsed.entityId))
      .limit(1);
    wsId = task?.workspaceId ?? "";
  } else if (parsed.entityType === "file") {
    const { files } = await import("@/db/schema");
    const [file] = await db
      .select({ workspaceId: files.workspaceId })
      .from(files)
      .where(eq(files.id, parsed.entityId))
      .limit(1);
    wsId = file?.workspaceId ?? "";
  } else if (parsed.entityType === "invoice") {
    const { invoices } = await import("@/db/schema");
    const [inv] = await db
      .select({ workspaceId: invoices.workspaceId })
      .from(invoices)
      .where(eq(invoices.id, parsed.entityId))
      .limit(1);
    wsId = inv?.workspaceId ?? "";
  }

  if (!wsId) throw new Error("Entity not found");

  // Validate portal token
  const { clients } = await import("@/db/schema");
  const { createHash } = await import("crypto");
  const tokenHash = createHash("sha256").update(parsed.token).digest("hex");

  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.portalTokenHash, tokenHash),
        eq(clients.workspaceId, wsId),
      ),
    )
    .limit(1);

  if (!client) throw new Error("Invalid portal token");
  if (client.portalTokenRevokedAt) throw new Error("Portal token revoked");
  if (client.portalTokenExpiresAt && new Date(client.portalTokenExpiresAt) < new Date()) throw new Error("Portal token expired");

  const [comment] = await db.insert(comments).values({
    workspaceId: wsId,
    entityType: parsed.entityType,
    entityId: parsed.entityId,
    body: parsed.body,
    visibility: "client",
    authorId: null,
    authorName: parsed.authorName,
    authorEmail: parsed.authorEmail,
    source: "portal",
  }).returning();

  return comment;
}

export async function deleteComment(commentId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.workspaceId, workspaceId)))
    .limit(1);

  if (!comment) throw new Error("Comment not found");

  await db.delete(comments).where(eq(comments.id, commentId));
  await writeActivityLog(workspaceId, user.id, "deleted_comment", "comment", commentId);
  return { success: true };
}
