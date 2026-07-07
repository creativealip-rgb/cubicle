import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects, workspaces, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { renderClientPdf } from "@/lib/pdf/client-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) return NextResponse.json({ error: "Workspace not selected" }, { status: 400 });

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const clientRows = await db.select().from(clients).where(eq(clients.workspaceId, workspaceId)).orderBy(desc(clients.createdAt));
  const projectRows = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
  const lang = (cookieStore.get("cubiqlo_lang")?.value === "en" ? "en" : "id") as "id" | "en";

  const buf = await renderClientPdf({
    title: lang === "en" ? "All Clients" : "Semua Klien",
    generatedAt: new Date().toLocaleString(lang === "en" ? "en-US" : "id-ID", { timeZone: "Asia/Jakarta" }),
    workspaceName: workspace?.name ?? "Cubiqlo",
    lang,
    clients: clientRows.map((client) => ({
      name: client.name,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone,
      website: client.website,
      address: client.address,
      status: client.status,
      tags: client.tags,
      internalNotes: client.internalNotes,
      portalEnabled: client.portalEnabled,
      createdAt: new Date(client.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { timeZone: "Asia/Jakarta" }),
      projects: projectRows
        .filter((project) => project.clientId === client.id)
        .map((project) => ({
          name: project.name,
          status: project.status,
          dueDate: project.dueDate ? String(project.dueDate) : null,
          clientVisible: project.clientVisible,
        })),
    })),
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"clients.pdf\"",
      "Cache-Control": "private, no-store",
    },
  });
}
