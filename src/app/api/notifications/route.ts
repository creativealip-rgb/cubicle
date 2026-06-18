import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "@/lib/in-app-notifications";

// GET /api/notifications?limit=30
// Returns list + unread count for current user.
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "30")));

  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, limit),
    getUnreadCount(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

// PATCH /api/notifications
// Body: { id?: string, all?: boolean }
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { id?: string; all?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (body.all) {
    const r = await markAllRead(session.user.id);
    return NextResponse.json({ marked: r.length });
  }
  if (body.id) {
    const r = await markRead(body.id, session.user.id);
    return NextResponse.json({ marked: r.length });
  }
  return NextResponse.json({ error: "id or all required" }, { status: 400 });
}
