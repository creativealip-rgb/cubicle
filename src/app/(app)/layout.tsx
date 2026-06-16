import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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

  return (
    <AppShell
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image,
        role: member?.role ?? "viewer",
      }}
    >
      {children}
    </AppShell>
  );
}
