import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { requireUser, assertWorkspaceOwner } from "@/lib/access";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const user = requireUser(session?.user);
  const body = await req.json();
  const { workspaceId, replyToEmail } = body as { workspaceId: string; replyToEmail: string | null };

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    await assertWorkspaceOwner(db, user.id, workspaceId);
  } catch (err) {
    const status = err instanceof Error && err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Workspace access denied" },
      { status },
    );
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
