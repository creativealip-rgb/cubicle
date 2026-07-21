import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { and, eq, desc } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { clients, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";

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

  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(desc(clients.createdAt));
  const rows = clientRows.map((client) => {
    return {
      Nama: client.name,
      "Custom ID": client.clientNumber ?? "",
      "Contact Person": client.name,
      Perusahaan: client.companyName ?? "",
      Email: client.email ?? "",
      "Nomor Telepon": client.phone ?? "",
      Alamat: client.address ?? "",
      Website: client.website ?? "",
      Status: client.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Klien");
  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="clients.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
