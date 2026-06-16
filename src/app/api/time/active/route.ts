import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { getActiveTimer } from "@/lib/actions/time";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ activeTimer: null }, { status: 401 });
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ activeTimer: null });
  }

  const activeTimer = await getActiveTimer(workspace.id, session.user.id);

  return NextResponse.json({
    activeTimer: activeTimer
      ? {
          id: activeTimer.id,
          startTime: activeTimer.startTime,
          clientName: activeTimer.clientName,
          projectName: activeTimer.projectName,
          taskTitle: activeTimer.taskTitle,
          description: activeTimer.description,
        }
      : null,
  });
}
