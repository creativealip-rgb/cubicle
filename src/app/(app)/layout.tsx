import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, ne, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import { workspaces, workspaceMembers, tasks } from "@/db/schema";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);

  const [member] = workspace
    ? await db
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, session.user.id)))
        .limit(1)
    : [];

  // Count tasks assigned to current user that are not done
  // (sidebar badge "X tasks assigned to you")
  const [{ myOpenTasksCount = 0 } = {}] = workspace
    ? await db
        .select({ myOpenTasksCount: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspace.id),
            eq(tasks.assigneeId, session.user.id),
            ne(tasks.status, "done"),
          ),
        )
    : [{ myOpenTasksCount: 0 }];

  return (
    <AppShell
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
        role: member?.role ?? "viewer",
      }}
      myOpenTasksCount={myOpenTasksCount}
    >
      {children}
    </AppShell>
  );
}
