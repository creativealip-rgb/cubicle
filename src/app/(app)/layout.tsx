import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, ne, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import {
  workspaces,
  workspaceMembers,
  tasks,
  invoices,
  proposals,
  contracts,
} from "@/db/schema";

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

  // Sidebar badge counts (workspace-scoped)
  async function countInvoices(sqlFilter: ReturnType<typeof sql>) {
    if (!workspace) return 0;
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.workspaceId, workspace.id), sqlFilter));
    return row?.n ?? 0;
  }
  async function countProposals(sqlFilter: ReturnType<typeof sql>) {
    if (!workspace) return 0;
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(proposals)
      .where(and(eq(proposals.workspaceId, workspace.id), sqlFilter));
    return row?.n ?? 0;
  }
  async function countContracts(sqlFilter: ReturnType<typeof sql>) {
    if (!workspace) return 0;
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(contracts)
      .where(and(eq(contracts.workspaceId, workspace.id), sqlFilter));
    return row?.n ?? 0;
  }

  const [unpaidInvoices, draftProposals, draftContracts] = await Promise.all([
    countInvoices(sql`${invoices.status} in ('sent','viewed','overdue')`),
    countProposals(sql`${proposals.status} = 'draft'`),
    countContracts(sql`${contracts.status} = 'draft'`),
  ]);

  const badgeCounts = {
    myOpenTasks: myOpenTasksCount,
    unpaidInvoices,
    draftProposals,
    draftContracts,
  };

  return (
    <AppShell
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
        role: member?.role ?? "viewer",
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AppShell>
  );
}
