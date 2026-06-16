"use server";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { z } from "zod";

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

  return comment;
}
