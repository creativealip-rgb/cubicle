import { redirect } from "next/navigation";
import { createTicket, listTickets, getTicketCounts } from "@/lib/actions/support";
import { db } from "@/db";
import { clients, projects, users, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireUser } from "@/lib/access";
import { SupportPageClient } from "./support-client";

export default async function SupportPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();

  const [tickets, counts, clientList, projectList, memberList] = await Promise.all([
    listTickets(),
    getTicketCounts(),
    db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.workspaceId, workspaceId)).orderBy(clients.name),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(projects.name),
    db
      .select({ userId: workspaceMembers.userId, name: users.name })
      .from(workspaceMembers)
      .leftJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
  ]);

  const countMap: Record<string, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  for (const c of counts) {
    countMap[c.status] = Number(c.count);
  }

  async function createTicketAction(formData: FormData) {
    "use server";
    await createTicket({
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || "") || undefined,
      priority: String(formData.get("priority") || "medium") as "low" | "medium" | "high" | "urgent",
      assigneeId: String(formData.get("assigneeId") || "") || undefined,
      clientId: String(formData.get("clientId") || "") || undefined,
      projectId: String(formData.get("projectId") || "") || undefined,
    });
    redirect("/app/support");
  }

  return (
    <SupportPageClient
      tickets={tickets}
      counts={countMap}
      clients={clientList}
      projects={projectList}
      members={memberList.map((m) => ({ id: m.userId, name: m.name || "Unknown" }))}
      createAction={createTicketAction}
    />
  );
}
