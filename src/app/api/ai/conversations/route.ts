import { getWorkspaceForCurrentUser } from "@/lib/workspace";
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
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { enforcePlanApiRateLimit } from "@/lib/plan-api-rate-limit";
import { getAiEntitlementFailure, getUserPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wsId = await getWorkspaceForCurrentUser();
  const limited = await enforceRateLimitResponse(req, "ai:conversations", { limit: 60, windowSec: 60 }, { identity: session.user.id });
  if (limited) return limited;
  const plan = await getUserPlan(session.user.id);
  const entitlementFailure = getAiEntitlementFailure(plan);
  if (entitlementFailure) {
    return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
  }
  const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId: wsId });
  if (apiLimited) return apiLimited;
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const messages = await listMessages(id, wsId, session.user.id);
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
  const wsId = await getWorkspaceForCurrentUser();
  const limited = await enforceRateLimitResponse(req, "ai:conversations", { limit: 60, windowSec: 60 }, { identity: session.user.id });
  if (limited) return limited;
  const plan = await getUserPlan(session.user.id);
  const entitlementFailure = getAiEntitlementFailure(plan);
  if (entitlementFailure) {
    return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
  }
  const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId: wsId });
  if (apiLimited) return apiLimited;
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
  const wsId = await getWorkspaceForCurrentUser();
  const limited = await enforceRateLimitResponse(req, "ai:conversations", { limit: 60, windowSec: 60 }, { identity: session.user.id });
  if (limited) return limited;
  const plan = await getUserPlan(session.user.id);
  const entitlementFailure = getAiEntitlementFailure(plan);
  if (entitlementFailure) {
    return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
  }
  const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId: wsId });
  if (apiLimited) return apiLimited;
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = await getOrCreateConv(wsId, session.user.id, body.id);
  return NextResponse.json({ id });
}
