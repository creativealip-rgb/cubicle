import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import * as ExcelJS from "exceljs";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same workspace resolution as app pages (cookie → membership → auto-create)
    const workspaceId = await getWorkspaceForCurrentUser();

    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId))
      .orderBy(desc(clients.createdAt));

    const rows = clientRows.map((client) => ({
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
    }));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Cubiqlo";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Klien");
    const headersRow = [
      "Nama",
      "Custom ID",
      "Contact Person",
      "Perusahaan",
      "Email",
      "Nomor Telepon",
      "Alamat",
      "Website",
      "Tag",
      "Status",
      "Portal",
    ] as const;

    worksheet.columns = headersRow.map((key) => ({
      header: key,
      key,
      width: Math.max(key.length + 2, 16),
    }));
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };

    const buf = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="clients-${stamp}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[clients/export/xlsx]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
