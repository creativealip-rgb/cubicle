"use server";

import { db } from "@/db";
import { comments, users, workspaceMembers, notifications } from "@/db/schema";
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

  // Notify workspace team via in-app + email (best-effort, never throw to caller)
  try {
    const members = await db
      .select({ id: users.id, email: users.email })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, parsed.workspaceId));

    if (members.length > 0) {
      await db.insert(notifications).values(
        members.map((member) => ({
          workspaceId: parsed.workspaceId,
          userId: member.id,
          type: "client_comment" as const,
          title: `${parsed.authorName} commented via client portal`,
          body: parsed.body.slice(0, 140),
          link: parsed.entityType === "project" ? `/app/projects/${parsed.entityId}` : `/${parsed.entityType === "task" ? "app/tasks" : "app/files"}?focus=${parsed.entityId}`,
          entityType: parsed.entityType,
          entityId: parsed.entityId,
          actorId: null,
        })),
      );
    }

    await Promise.all(
      members
        .filter((member) => Boolean(member.email))
        .map((member) =>
          notifyPortalComment({
            workspaceEmail: member.email,
            clientName: parsed.authorName,
            entityType: parsed.entityType,
            commentPreview: parsed.body.slice(0, 140),
          }),
        ),
    );
  } catch (err) {
    console.error("[portal-comment-notify-fail]", err);
  }

  return comment;
}
