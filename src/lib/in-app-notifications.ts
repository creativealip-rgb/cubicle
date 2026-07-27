// In-app notifications — stored in `notifications` table,
// shown via bell icon in app topbar.
// Email delivery is a separate concern (see notifications.ts Resend).
//
// Design:
// - Bell inbox = event log (assign, paid, portal request, approvals, signed/paid/viewed events).
// - Dashboard Reminder = live action state (overdue invoice, tasks due today, contracts waiting).
//   Remains until underlying state is fixed — NOT the same as bell.
// - Recurring/state reminders (invoice_overdue, task_due_soon) are dashboard-only.
//   Keep them out of bell list/unread counts to avoid duplicate urgency surfaces.
// - Per-recipient (user_id) — owner/members each get their own copy
// - Link is relative app path so the topbar can deep-link
// - read_at is nullable: null = unread
// - Actor points to the user that triggered the event (nullable: client-portal events)

import { db } from "@/db";
import { notifications, workspaceMembers } from "@/db/schema";
import { and, eq, gte, isNull, notInArray, sql } from "drizzle-orm";

export type NotificationType =
  | "task_assigned"
  | "task_commented"
  | "client_comment"
  | "client_task_approved"
  | "client_task_revision"
  | "file_viewed"
  | "client_file_uploaded"
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
  | "mention"
  | "portal_report_request"
  | "portal_meeting_request";

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
  /** Skip insert if same user/type/entity unread or within cooldown. Default true for recurring types. */
  dedupe?: boolean;
  /** Hours to suppress re-notify after last insert of same user/type/entity. Default 24. */
  dedupeHours?: number;
}

/** Types that re-fire from cron/state checks and must not spam the bell. */
const RECURRING_TYPES = new Set<NotificationType>(["invoice_overdue", "task_due_soon"]);
const DASHBOARD_ONLY_TYPES: NotificationType[] = ["invoice_overdue", "task_due_soon"];

async function shouldSkipDuplicate(
  userId: string,
  type: NotificationType,
  entityId: string | null | undefined,
  dedupeHours: number,
): Promise<boolean> {
  if (!entityId) return false;

  const since = new Date(Date.now() - Math.max(1, dedupeHours) * 60 * 60 * 1000);

  // Unread of same entity still sits in inbox → never re-insert.
  const [unread] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        eq(notifications.entityId, entityId),
        isNull(notifications.readAt),
      ),
    )
    .limit(1);
  if (unread) return true;

  // Recent insert (even if already read) → wait for cooldown before resurfacing.
  const [recent] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        eq(notifications.entityId, entityId),
        gte(notifications.createdAt, since),
      ),
    )
    .limit(1);
  return Boolean(recent);
}

/** Insert one notification (with optional dedupe for recurring types). */
export async function createNotification(input: CreateNotificationInput) {
  const dedupe = input.dedupe ?? RECURRING_TYPES.has(input.type);
  const dedupeHours = input.dedupeHours ?? 24;

  if (dedupe && (await shouldSkipDuplicate(input.userId, input.type, input.entityId, dedupeHours))) {
    return null;
  }

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
  payload: Omit<CreateNotificationInput, "workspaceId" | "userId">,
) {
  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  if (members.length === 0) return [];

  const dedupe = payload.dedupe ?? RECURRING_TYPES.has(payload.type);
  const dedupeHours = payload.dedupeHours ?? 24;
  const recipients: string[] = [];

  for (const m of members) {
    if (dedupe && (await shouldSkipDuplicate(m.userId, payload.type, payload.entityId, dedupeHours))) {
      continue;
    }
    recipients.push(m.userId);
  }

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
  payload: Omit<CreateNotificationInput, "workspaceId" | "userId">,
) {
  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const candidates = members.map((m) => m.userId).filter((uid) => uid !== actorId);
  if (candidates.length === 0) return [];

  const dedupe = payload.dedupe ?? RECURRING_TYPES.has(payload.type);
  const dedupeHours = payload.dedupeHours ?? 24;
  const recipients: string[] = [];

  for (const userId of candidates) {
    if (dedupe && (await shouldSkipDuplicate(userId, payload.type, payload.entityId, dedupeHours))) {
      continue;
    }
    recipients.push(userId);
  }

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
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        notInArray(notifications.type, DASHBOARD_ONLY_TYPES),
      ),
    );
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
    .where(and(eq(notifications.userId, userId), notInArray(notifications.type, DASHBOARD_ONLY_TYPES)))
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
