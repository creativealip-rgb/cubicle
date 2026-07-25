import { headers } from "next/headers";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import * as ExcelJS from "exceljs";
import { db } from "@/db";
import {
  clients,
  expenseCategories,
  expenses,
  invoices,
  payments,
  workspaceCurrencyRates,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import {
  buildRateMap,
  convertToBase,
  normalizeCurrency,
} from "@/lib/currency-base";
import {
  buildReportPeriod,
  buildTimeGroups,
  reportPeriodLabel,
} from "@/lib/report-period";
import { styleWorksheet, xlsxResponse } from "@/lib/excel";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await getWorkspaceFullForCurrentUser();
    const q = new URL(request.url).searchParams;
    const period = buildReportPeriod({
      period: q.get("period") || undefined,
      from: q.get("from") || undefined,
      to: q.get("to") || undefined,
    });
    const base = normalizeCurrency(ws.defaultCurrency || "IDR");
    const rateRows = await db
      .select({
        fromCurrency: workspaceCurrencyRates.fromCurrency,
        rate: workspaceCurrencyRates.rate,
      })
      .from(workspaceCurrencyRates)
      .where(eq(workspaceCurrencyRates.workspaceId, ws.id));
    const rates = buildRateMap(rateRows);
    const incomeRows = await db
      .select({
        date: payments.paidAt,
        amount: payments.amount,
        currency: invoices.currency,
        client: clients.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(
        and(
          eq(invoices.workspaceId, ws.id),
          gte(payments.paidAt, period.start),
          lte(payments.paidAt, period.end),
        ),
      );
    const expenseRows = await db
      .select({
        date: expenses.date,
        amount: expenses.amount,
        currency: expenses.currency,
        category: expenseCategories.name,
      })
      .from(expenses)
      .leftJoin(
        expenseCategories,
        eq(expenseCategories.id, expenses.categoryId),
      )
      .where(
        and(
          eq(expenses.workspaceId, ws.id),
          gte(expenses.date, period.start),
          lte(expenses.date, period.end),
        ),
      );
    const cv = (a: string | number | null, c: string) =>
      convertToBase(Number(a ?? 0), c, base, rates);
    let income = 0,
      expense = 0;
    const sources = new Map<string, { total: number; count: number }>(),
      cats = new Map<string, { total: number; count: number }>();
    for (const r of incomeRows) {
      const v = cv(r.amount, r.currency);
      if (v === null) continue;
      income += v;
      const x = sources.get(r.client) || { total: 0, count: 0 };
      x.total += v;
      x.count++;
      sources.set(r.client, x);
    }
    for (const r of expenseRows) {
      const v = cv(r.amount, r.currency);
      if (v === null) continue;
      expense += v;
      const k = r.category || "Tanpa kategori",
        x = cats.get(k) || { total: 0, count: 0 };
      x.total += v;
      x.count++;
      cats.set(k, x);
    }
    const groups = buildTimeGroups(
      period.start,
      period.end,
      period.preset,
      "id",
    );
    const trend = groups.map((g) => ({
      Periode: g.label,
      Pemasukan: 0,
      Pengeluaran: 0,
      Bersih: 0,
    }));
    for (const r of incomeRows) {
      const i = groups.findIndex((g) => r.date >= g.start && r.date <= g.end),
        v = cv(r.amount, r.currency);
      if (i >= 0 && v !== null) trend[i].Pemasukan += v;
    }
    for (const r of expenseRows) {
      const i = groups.findIndex((g) => r.date >= g.start && r.date <= g.end),
        v = cv(r.amount, r.currency);
      if (i >= 0 && v !== null) trend[i].Pengeluaran += v;
    }
    trend.forEach((x) => (x.Bersih = x.Pemasukan - x.Pengeluaran));
    const aging = await db
      .select({
        invoice: invoices.invoiceNumber,
        client: clients.name,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        paid: sql<string>`coalesce((select sum(${payments.amount}) from ${payments} where ${payments.invoiceId}=${invoices.id}),0)::text`,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(
        and(
          eq(invoices.workspaceId, ws.id),
          inArray(invoices.status, ["sent", "viewed", "overdue"]),
        ),
      );
    const today = new Date().toISOString().slice(0, 10);
    const receivables = aging
      .map((r) => {
        const remaining = Math.max(0, Number(r.total) - Number(r.paid));
        return {
          Invoice: r.invoice,
          Klien: r.client,
          Sisa: remaining,
          MataUang: r.currency,
          JatuhTempo: r.dueDate || "",
          HariTerlambat:
            r.dueDate && r.dueDate < today
              ? Math.floor(
                  (Date.parse(today) - Date.parse(r.dueDate)) / 86400000,
                )
              : 0,
        };
      })
      .filter((r) => r.Sisa > 0);
    const wb = new ExcelJS.Workbook();
    wb.creator = "Cubiqlo";
    wb.created = new Date();
    const add = (
      name: string,
      columns: { header: string; key: string; width: number }[],
      rows: Record<string, unknown>[],
    ) => {
      const s = wb.addWorksheet(name);
      s.columns = columns;
      s.addRows(rows);
      styleWorksheet(
        s,
        columns.map((c) => c.width),
      );
      return s;
    };
    const summary = add(
      "Ringkasan",
      [
        { header: "Metrik", key: "Metrik", width: 24 },
        { header: "Nilai", key: "Nilai", width: 20 },
        { header: "Mata Uang / Info", key: "Info", width: 24 },
      ],
      [
        {
          Metrik: "Periode",
          Nilai: reportPeriodLabel(period, "id"),
          Info: `${period.start} – ${period.end}`,
        },
        { Metrik: "Pemasukan", Nilai: income, Info: base },
        { Metrik: "Pengeluaran", Nilai: expense, Info: base },
        { Metrik: "Bersih", Nilai: income - expense, Info: base },
        {
          Metrik: "Margin",
          Nilai: income ? (income - expense) / income : 0,
          Info: "Persentase",
        },
      ],
    );
    summary.getColumn("Nilai").numFmt = "#,##0.00";
    const moneyCols = [
      { header: "Nama", key: "Nama", width: 28 },
      { header: "Jumlah Transaksi", key: "Transaksi", width: 18 },
      { header: `Total (${base})`, key: "Total", width: 20 },
    ];
    add(
      "Tren",
      [
        { header: "Periode", key: "Periode", width: 18 },
        { header: "Pemasukan", key: "Pemasukan", width: 20 },
        { header: "Pengeluaran", key: "Pengeluaran", width: 20 },
        { header: "Bersih", key: "Bersih", width: 20 },
      ],
      trend,
    );
    add(
      "Sumber Pemasukan",
      moneyCols,
      [...sources]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([Nama, x]) => ({ Nama, Transaksi: x.count, Total: x.total })),
    );
    add(
      "Kategori Pengeluaran",
      moneyCols,
      [...cats]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([Nama, x]) => ({ Nama, Transaksi: x.count, Total: x.total })),
    );
    add(
      "Piutang",
      [
        { header: "Invoice", key: "Invoice", width: 20 },
        { header: "Klien", key: "Klien", width: 28 },
        { header: "Sisa", key: "Sisa", width: 20 },
        { header: "Mata Uang", key: "MataUang", width: 14 },
        { header: "Jatuh Tempo", key: "JatuhTempo", width: 16 },
        { header: "Hari Terlambat", key: "HariTerlambat", width: 16 },
      ],
      receivables,
    );
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return xlsxResponse(buffer, `laporan-${period.start}-${period.end}.xlsx`);
  } catch (error) {
    console.error("[reports/export/xlsx]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
