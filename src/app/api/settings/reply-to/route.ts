import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspaceId, replyToEmail } = body as { workspaceId: string; replyToEmail: string | null };

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  // Validate email format if provided
  if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  await db
    .update(workspaces)
    .set({ replyToEmail: replyToEmail || null })
    .where(eq(workspaces.id, workspaceId));

  return NextResponse.json({ ok: true });
}
