// In-app notifications — stored in `notifications` table,
// shown via bell icon in app topbar.
// Email delivery is a separate concern (see notifications.ts Resend).
//
// Design:
// - One notification per (recipient, event) — dedup by entityType+entityId if you like
// - Per-recipient (user_id) — owner/members each get their own copy
// - Link is relative app path so the topbar can deep-link
// - read_at is nullable: null = unread
// - Actor points to the user that triggered the event (nullable: client-portal events)

import { db } from "@/db";
import { notifications, workspaceMembers } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

export type NotificationType =
  | "task_assigned"
  | "task_commented"
  | "client_comment"
  | "client_task_approved"
  | "client_task_revision"
  | "file_viewed"
  | "invoice_paid"
  | "invoice_sent"
  | "proposal_viewed"
  | "contract_signed"
  | "contract_viewed"
  | "questionnaire_answered"
  | "booking_created"
  | "task_status_changed"
  | "task_due_soon"
  | "invoice_overdue"
  | "mention";

export interface CreateNotificationInput {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string | null;
}

/** Insert one notification. */
export async function createNotification(input: CreateNotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actorId: input.actorId ?? null,
    })
    .returning({ id: notifications.id });
  return row;
}

/**
 * Notify every workspace member (any role) in a workspace.
 * Use this when an event affects the team broadly (e.g. invoice paid).
 */
export async function notifyWorkspaceMembers(
  workspaceId: string,
  payload: Omit<CreateNotificationInput, "workspaceId" | "userId">
) {
  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  if (members.length === 0) return [];

  const rows = members.map((m) => ({
    workspaceId,
    userId: m.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    actorId: payload.actorId ?? null,
  }));

  return db.insert(notifications).values(rows).returning({ id: notifications.id, userId: notifications.userId });
}

/**
 * Notify all members EXCEPT the actor (the person who triggered the event
 * doesn't need to be notified they did the thing).
 */
export async function notifyWorkspaceMembersExceptActor(
  workspaceId: string,
  actorId: string | null | undefined,
  payload: Omit<CreateNotificationInput, "workspaceId" | "userId">
) {
  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const recipients = members
    .map((m) => m.userId)
    .filter((uid) => uid !== actorId);

  if (recipients.length === 0) return [];

  const rows = recipients.map((userId) => ({
    workspaceId,
    userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    actorId: actorId ?? null,
  }));

  return db.insert(notifications).values(rows).returning({ id: notifications.id, userId: notifications.userId });
}

/** Count unread notifications for one user. */
export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.c ?? 0;
}

/** List notifications for one user (newest first). */
export async function listNotifications(userId: string, limit = 30) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      actorId: notifications.actorId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(sql`${notifications.createdAt} desc`)
    .limit(limit);
}

/** Mark a single notification as read (must belong to user). */
export async function markRead(notificationId: string, userId: string) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
}

/** Mark all unread for user as read. */
export async function markAllRead(userId: string) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
}
