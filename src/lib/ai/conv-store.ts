/**
 * Conversation store for AI Assistant.
 * Server-side persistence (Postgres) so chats survive reload.
 * Per-user, per-workspace, with auto-titling from first user message.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";

export interface ConvSummary {
  id: string;
  title: string;
  isPinned: boolean;
  updatedAt: string;
  messageCount: number;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls: unknown[];
  toolName: string | null;
  confirmationStatus?: "pending" | "done" | "failed" | "cancelled" | null;
  tokens: number;
  createdAt: string;
}

/** Get-or-create a conversation. If no id given, create new. */
export async function getOrCreateConv(
  workspaceId: string,
  userId: string,
  conversationId?: string,
): Promise<string> {
  if (conversationId) {
    // Verify ownership
    const [existing] = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.workspaceId, workspaceId),
          eq(aiConversations.userId, userId),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }
  const [created] = await db
    .insert(aiConversations)
    .values({ workspaceId, userId, title: "New chat" })
    .returning({ id: aiConversations.id });
  if (!created) throw new Error("Failed to create conversation");
  return created.id;
}

export async function listConversations(
  workspaceId: string,
  userId: string,
  limit = 30,
): Promise<ConvSummary[]> {
  const rows = await db
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      isPinned: aiConversations.isPinned,
      updatedAt: aiConversations.updatedAt,
      messageCount: sql<number>`count(${aiMessages.id})::int`,
    })
    .from(aiConversations)
    .leftJoin(aiMessages, eq(aiMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiConversations.workspaceId, workspaceId),
        eq(aiConversations.userId, userId),
      ),
    )
    .groupBy(aiConversations.id)
    .orderBy(desc(aiConversations.isPinned), desc(aiConversations.updatedAt))
    .limit(limit);
  return rows.map((r: { id: string; title: string; isPinned: boolean; updatedAt: Date; messageCount: number }) => ({
    id: r.id,
    title: r.title,
    isPinned: r.isPinned ?? false,
    updatedAt: r.updatedAt.toISOString(),
    messageCount: r.messageCount,
  }));
}

export async function listMessages(
  conversationId: string,
  workspaceId: string,
  userId: string,
  limit = 100,
): Promise<PersistedMessage[]> {
  const rows = await db
    .select({
      id: aiMessages.id,
      role: aiMessages.role,
      content: aiMessages.content,
      toolCalls: aiMessages.toolCalls,
      toolName: aiMessages.toolName,
      confirmationStatus: aiMessages.confirmationStatus,
      tokens: aiMessages.tokens,
      createdAt: aiMessages.createdAt,
    })
    .from(aiMessages)
    .innerJoin(
      aiConversations,
      and(
        eq(aiMessages.conversationId, aiConversations.id),
        eq(aiConversations.workspaceId, workspaceId),
        eq(aiConversations.userId, userId),
      ),
    )
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt)
    .limit(limit);
  return rows.map((r: {
    id: string;
    role: string;
    content: string;
    toolCalls: unknown;
    toolName: string | null;
    confirmationStatus: "pending" | "done" | "failed" | "cancelled" | null;
    tokens: number;
    createdAt: Date;
  }) => ({
    id: r.id,
    role: r.role as "user" | "assistant" | "tool",
    content: r.content,
    toolCalls: (r.toolCalls as unknown[]) ?? [],
    toolName: r.toolName,
    confirmationStatus: r.confirmationStatus,
    tokens: r.tokens,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function appendMessage(
  conversationId: string,
  msg: {
    role: "user" | "assistant" | "tool";
    content: string;
    toolCalls?: unknown[];
    toolName?: string | null;
    confirmationStatus?: "pending" | "done" | "failed" | "cancelled" | null;
    tokens?: number;
  },
): Promise<string> {
  const [inserted] = await db.insert(aiMessages).values({
    conversationId,
    role: msg.role,
    content: msg.content,
    toolCalls: (msg.toolCalls ?? []) as unknown[],
    toolName: msg.toolName ?? null,
    confirmationStatus: msg.confirmationStatus ?? null,
    tokens: msg.tokens ?? 0,
  }).returning({ id: aiMessages.id });
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));
  return inserted?.id ?? "";
}

export async function updateMessageConfirmationStatus(
  messageId: string,
  status: "pending" | "done" | "failed" | "cancelled",
): Promise<void> {
  await db
    .update(aiMessages)
    .set({ confirmationStatus: status })
    .where(eq(aiMessages.id, messageId));
}
export async function maybeAutoTitle(
  conversationId: string,
  userMessage: string,
): Promise<void> {
  const [conv] = await db
    .select({ title: aiConversations.title })
    .from(aiConversations)
    .where(eq(aiConversations.id, conversationId))
    .limit(1);
  if (!conv || conv.title !== "New chat") return;
  const title = userMessage.trim().slice(0, 50).replace(/\s+/g, " ");
  if (!title) return;
  await db
    .update(aiConversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));
}
