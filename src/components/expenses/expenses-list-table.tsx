"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { formatMoney } from "@/lib/utils";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { EditExpenseButton } from "@/components/expenses/edit-expense-button";
import { ReceiptLinkButton } from "@/components/expenses/receipt-link-button";
import type {
  CategoryOption,
  ProjectOption,
  ClientOption,
} from "@/components/expenses/expense-form";

export type ExpenseListItem = {
  id: string;
  date: string;
  amount: number | string;
  currency: string;
  /** Converted amount in workspace base currency (null if rate missing / toggle off). */
  amountBase?: number | null;
  description: string;
  vendor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  taxIncluded: boolean | null;
  taxAmount: number | string | null;
  receiptUrl: string | null;
};

type SortKey =
  | "date"
  | "description"
  | "category"
  | "project"
  | "client"
  | "amount";

export function ExpensesListTable({
  rows,
  canWrite,
  workspaceId,
  defaultCurrency,
  baseCurrency,
  categories,
  projects,
  clients,
}: {
  rows: ExpenseListItem[];
  canWrite: boolean;
  workspaceId: string;
  defaultCurrency: string;
  /** Workspace base currency for secondary ≈ line. */
  baseCurrency?: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const { t } = useT();
  const base = (baseCurrency || defaultCurrency || "IDR").toUpperCase();

  const getters = useMemo(
    () => ({
      date: (r: ExpenseListItem) => r.date,
      description: (r: ExpenseListItem) => r.description,
      category: (r: ExpenseListItem) => r.categoryName ?? "",
      project: (r: ExpenseListItem) => r.projectName ?? "",
      client: (r: ExpenseListItem) => r.clientName ?? "",
      amount: (r: ExpenseListItem) => Number(r.amount) || 0,
    }),
    [],
  );

  const { sorted, toggle, dirFor } = useTableSort<ExpenseListItem, SortKey>(
    rows,
    getters,
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table className="[&_td]:p-3 [&_th]:px-3">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">
              <SortableHeader
                label={t("Tanggal", "Date")}
                dir={dirFor("date")}
                onClick={() => toggle("date")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Deskripsi", "Description")}
                dir={dirFor("description")}
                onClick={() => toggle("description")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Kategori", "Category")}
                dir={dirFor("category")}
                onClick={() => toggle("category")}
              />
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <SortableHeader
                label={t("Proyek", "Project")}
                dir={dirFor("project")}
                onClick={() => toggle("project")}
              />
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <SortableHeader
                label={t("Klien", "Client")}
                dir={dirFor("client")}
                onClick={() => toggle("client")}
              />
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">
              <SortableHeader
                label={t("Jumlah", "Amount")}
                dir={dirFor("amount")}
                onClick={() => toggle("amount")}
                align="right"
              />
            </TableHead>
            {canWrite && <TableHead className="w-24"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((e, index) => (
            <TableRow
              key={e.id}
              className={`border-b border-slate-200 hover:bg-slate-100/70 ${index % 2 === 1 ? "!bg-slate-50" : "!bg-white"}`}
            >
              <TableCell className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                {e.date}
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm">{e.description}</div>
                {e.vendor && (
                  <div className="text-xs text-slate-500">{e.vendor}</div>
                )}
              </TableCell>
              <TableCell>
                {e.categoryName ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: e.categoryColor ?? "#64748b" }}
                    />
                    {e.categoryName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-600 hidden md:table-cell">
                {e.projectName ?? <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell className="text-xs text-slate-600 hidden lg:table-cell">
                {e.clientName ?? <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm font-medium whitespace-nowrap">
                <div>{formatMoney(e.amount, e.currency)}</div>
                {e.amountBase != null &&
                  e.currency?.toUpperCase() !== base && (
                    <div className="text-xs font-normal text-muted-foreground">
                      ≈ {formatMoney(e.amountBase, base)}
                    </div>
                  )}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    {e.receiptUrl && <ReceiptLinkButton expenseId={e.id} />}
                    <EditExpenseButton
                      expense={{
                        id: e.id,
                        date: e.date,
                        amount: String(e.amount ?? ""),
                        currency: e.currency,
                        description: e.description,
                        categoryId: e.categoryId,
                        projectId: e.projectId,
                        clientId: e.clientId,
                        vendor: e.vendor,
                        taxIncluded: Boolean(e.taxIncluded),
                        taxAmount:
                          e.taxAmount === null || e.taxAmount === undefined
                            ? null
                            : String(e.taxAmount),
                        receiptUrl: e.receiptUrl,
                      }}
                      workspaceId={workspaceId}
                      defaultCurrency={defaultCurrency}
                      categories={categories}
                      projects={projects}
                      clients={clients}
                    />
                    <DeleteExpenseButton
                      expenseId={e.id}
                      description={e.description}
                    />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
