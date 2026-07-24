import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import * as ExcelJS from "exceljs";
import { db } from "@/db";
import { clients, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [member] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, client.workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!member) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }

    const detailRows = [
      {
        Nama: client.name,
        "Custom ID": client.clientNumber ?? "",
        "Contact Person": client.name,
        Perusahaan: client.companyName ?? "",
        Email: client.email ?? "",
        "Nomor Telepon": client.phone ?? "",
        Alamat: client.address ?? "",
        Website: client.website ?? "",
        Tag: (client.tags ?? []).join(", "),
        Status: client.status,
        Portal: client.portalEnabled ? "Aktif" : "Nonaktif",
        "Catatan Internal": client.internalNotes ?? "",
      },
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Cubiqlo";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Klien");
    worksheet.columns = Object.keys(detailRows[0]).map((key) => ({
      header: key,
      key,
      width: Math.max(key.length + 2, 16),
    }));
    worksheet.addRows(detailRows);
    worksheet.getRow(1).font = { bold: true };

    const buf = Buffer.from(await workbook.xlsx.writeBuffer());
    const safeName =
      client.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "client";

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="client-${safeName}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[clients/[clientId]/export/xlsx]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
