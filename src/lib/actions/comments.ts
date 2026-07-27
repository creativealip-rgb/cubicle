"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { comments, users, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { createNotification } from "@/lib/in-app-notifications";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const createCommentSchema = z.object({
  entityType: z.enum(["project", "task", "file", "invoice"]),
  entityId: z.string().uuid(),
  body: z.string().min(1, "Comment cannot be empty"),
  visibility: z.enum(["internal", "client"]).default("internal"),
});

export async function createComment(input: z.infer<typeof createCommentSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const parsed = createCommentSchema.parse(input);

  // Get user info for author fields
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

  // @mention notifications: match @first-name, @email-local, or @full-name-with-dashes.
  // Example: "@alip please review" -> notify Alip if name/email matches.
  try {
    const mentions = Array.from(parsed.body.matchAll(/@([a-zA-Z0-9._-]+)/g)).map((m) => m[1].toLowerCase());
    if (mentions.length > 0) {
      const members = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, workspaceId));

      for (const member of members) {
        if (member.id === user.id) continue;
        const name = (member.name ?? "").toLowerCase();
        const emailLocal = member.email.split("@")[0]?.toLowerCase() ?? "";
        const tokens = new Set([
          emailLocal,
          name.replace(/\s+/g, "-"),
          ...name.split(/\s+/).filter(Boolean),
        ]);
        if (mentions.some((m) => tokens.has(m))) {
          await createNotification({
            workspaceId,
            userId: member.id,
            type: "mention",
            title: `${dbUser?.name ?? dbUser?.email ?? "Someone"} mentioned you`,
            body: parsed.body.length > 100 ? parsed.body.slice(0, 97) + "..." : parsed.body,
            link: `/${parsed.entityType === "project" ? "app/projects" : parsed.entityType === "task" ? "app/tasks" : parsed.entityType === "file" ? "app/files" : "app/invoices"}${parsed.entityType === "project" || parsed.entityType === "invoice" ? `/${parsed.entityId}` : `?focus=${parsed.entityId}`}`,
            entityType: parsed.entityType,
            entityId: parsed.entityId,
            actorId: user.id,
          });
        }
      }
    }
  } catch {
    // best-effort
  }

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
