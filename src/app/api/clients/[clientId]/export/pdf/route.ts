import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects, workspaces, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { renderClientPdf } from "@/lib/pdf/client-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, client.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, client.workspaceId)).limit(1);
  const projectRows = await db.select().from(projects).where(eq(projects.clientId, client.id));
  const cookieStore = await cookies();
  const lang = (cookieStore.get("cubiqlo_lang")?.value === "en" ? "en" : "id") as "id" | "en";

  const buf = await renderClientPdf({
    title: lang === "en" ? "Client Detail" : "Detail Klien",
    generatedAt: new Date().toLocaleString(lang === "en" ? "en-US" : "id-ID", { timeZone: "Asia/Jakarta" }),
    workspaceName: workspace?.name ?? "Cubiqlo",
    lang,
    clients: [{
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
      projects: projectRows.map((project) => ({
        name: project.name,
        status: project.status,
        dueDate: project.dueDate ? String(project.dueDate) : null,
        clientVisible: project.clientVisible,
      })),
    }],
  });

  const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="client-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
