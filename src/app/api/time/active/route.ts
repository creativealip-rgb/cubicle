import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, projects, tasks, workspaces } from "@/db/schema";
import { getActiveTimer } from "@/lib/actions/time";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ activeTimer: null, options: null }, { status: 401 });
  }

  const workspaceId = await getWorkspaceForCurrentUser();
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ activeTimer: null, options: null });
  }

  const [activeTimer, clientList, projectList, taskList] = await Promise.all([
    getActiveTimer(workspace.id, session.user.id),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.workspaceId, workspace.id))
      .orderBy(asc(clients.name)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        billingType: projects.billingType,
        rate: projects.rate,
      })
      .from(projects)
      .where(eq(projects.workspaceId, workspace.id))
      .orderBy(asc(projects.name)),
    db
      .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.workspaceId, workspace.id))
      .orderBy(asc(tasks.title))
      .limit(300),
  ]);

  return NextResponse.json({
    workspaceId: workspace.id,
    activeTimer: activeTimer
      ? {
          id: activeTimer.id,
          startTime: activeTimer.startTime,
          pausedAt: activeTimer.pausedAt,
          clientId: activeTimer.clientId,
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          description: activeTimer.description,
          clientName: activeTimer.clientName,
          projectName: activeTimer.projectName,
          taskTitle: activeTimer.taskTitle,
        }
      : null,
    options: {
      clients: clientList,
      projects: projectList,
      tasks: taskList,
    },
  });
}
