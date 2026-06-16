/**
 * List + create AI conversations for the current user.
 *
 * GET  /api/ai/conversations           → list all for current user
 * GET  /api/ai/conversations?id=...    → list messages for a conversation
 * DELETE /api/ai/conversations?id=...  → delete a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { listConversations, listMessages, getOrCreateConv } from "@/lib/ai/conv-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getWorkspaceIdFromSession(userId: string): Promise<string> {
  // The AI assistant is workspace-scoped; we just use the user's first workspace.
  // For now, hardcode the demo workspace (same as tools.ts).
  const { workspaces } = await import("@/db/schema");
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  void userId;
  return ws.id;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wsId = await getWorkspaceIdFromSession(session.user.id);
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const messages = await listMessages(id);
    return NextResponse.json({ messages });
  }

  const list = await listConversations(wsId, session.user.id);
  return NextResponse.json({ conversations: list });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const wsId = await getWorkspaceIdFromSession(session.user.id);
  await db
    .delete(aiConversations)
    .where(
      and(
        eq(aiConversations.id, id),
        eq(aiConversations.workspaceId, wsId),
        eq(aiConversations.userId, session.user.id),
      ),
    );
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // Create new empty conversation (or get-or-create if id passed)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wsId = await getWorkspaceIdFromSession(session.user.id);
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = await getOrCreateConv(wsId, session.user.id, body.id);
  return NextResponse.json({ id });
}
