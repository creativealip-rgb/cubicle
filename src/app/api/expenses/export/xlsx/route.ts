import { headers } from "next/headers";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import * as ExcelJS from "exceljs";
import { db } from "@/db";
import { clients, expenseCategories, expenses, projects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { styleWorksheet, xlsxResponse } from "@/lib/excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await getWorkspaceForCurrentUser();
    const params = new URL(request.url).searchParams;
    const month = params.get("month");
    const categoryId = params.get("categoryId");
    const q = params.get("q")?.trim().toLowerCase();
    const conditions = [eq(expenses.workspaceId, workspaceId)];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      conditions.push(gte(expenses.date, `${month}-01`));
      conditions.push(lte(expenses.date, `${month}-31`));
    }
    if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));

    const rows = await db
      .select({
        date: expenses.date,
        description: expenses.description,
        amount: expenses.amount,
        currency: expenses.currency,
        category: expenseCategories.name,
        vendor: expenses.vendor,
        project: projects.name,
        client: clients.name,
        taxIncluded: expenses.taxIncluded,
        taxAmount: expenses.taxAmount,
      })
      .from(expenses)
      .leftJoin(
        expenseCategories,
        eq(expenseCategories.id, expenses.categoryId),
      )
      .leftJoin(projects, eq(projects.id, expenses.projectId))
      .leftJoin(clients, eq(clients.id, expenses.clientId))
      .where(and(...conditions))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(5000);
    const filtered = q
      ? rows.filter((row) =>
          [
            row.description,
            row.vendor,
            row.category,
            row.project,
            row.client,
          ].some((value) => value?.toLowerCase().includes(q)),
        )
      : rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Cubiqlo";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Pengeluaran");
    sheet.columns = [
      { header: "Tanggal", key: "date" },
      { header: "Deskripsi", key: "description" },
      { header: "Jumlah", key: "amount" },
      { header: "Mata Uang", key: "currency" },
      { header: "Kategori", key: "category" },
      { header: "Vendor", key: "vendor" },
      { header: "Proyek", key: "project" },
      { header: "Klien", key: "client" },
      { header: "Pajak Termasuk", key: "taxIncluded" },
      { header: "Jumlah Pajak", key: "taxAmount" },
    ];
    sheet.addRows(
      filtered.map((row) => ({
        ...row,
        amount: Number(row.amount),
        taxAmount: Number(row.taxAmount ?? 0),
        taxIncluded: row.taxIncluded ? "Ya" : "Tidak",
      })),
    );
    styleWorksheet(sheet, [14, 34, 16, 12, 20, 20, 22, 22, 16, 16]);
    sheet.getColumn("amount").numFmt = "#,##0.00";
    sheet.getColumn("taxAmount").numFmt = "#,##0.00";
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return xlsxResponse(
      buffer,
      `pengeluaran-${month || "semua"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  } catch (error) {
    console.error("[expenses/export/xlsx]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
