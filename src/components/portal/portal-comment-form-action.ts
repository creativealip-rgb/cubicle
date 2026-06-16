"use server";

import { db } from "@/db";
import { comments, workspaces, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { notifyPortalComment } from "@/lib/notifications";

const portalCommentSchema = z.object({
  entityType: z.enum(["project", "task", "file"]),
  entityId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  authorName: z.string().min(1, "Name required"),
  authorEmail: z.string().email("Valid email required"),
  body: z.string().min(1, "Message required"),
});

export async function createPortalComment(
  input: z.infer<typeof portalCommentSchema>,
) {
  const parsed = portalCommentSchema.parse(input);

  const [comment] = await db
    .insert(comments)
    .values({
      workspaceId: parsed.workspaceId,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      body: parsed.body,
      visibility: "client",
      authorName: parsed.authorName,
      authorEmail: parsed.authorEmail,
      source: "portal",
    })
    .returning();

  // Notify workspace owner (best-effort, never throw to caller)
  try {
    const [owner] = await db
      .select({ email: users.email })
      .from(workspaces)
      .innerJoin(users, eq(users.id, workspaces.ownerId))
      .where(eq(workspaces.id, parsed.workspaceId))
      .limit(1);

    if (owner?.email) {
      await notifyPortalComment({
        workspaceEmail: owner.email,
        clientName: parsed.authorName,
        entityType: parsed.entityType,
        commentPreview: parsed.body.slice(0, 140),
      });
    }
  } catch (err) {
    console.error("[portal-comment-notify-fail]", err);
  }

  return comment;
}
