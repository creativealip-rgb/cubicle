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

function ExpenseActions({
  e,
  mobile = false,
  canWrite,
  workspaceId,
  defaultCurrency,
  categories,
  projects,
  clients,
}: {
  e: ExpenseListItem;
  mobile?: boolean;
  canWrite: boolean;
  workspaceId: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  if (!canWrite) return null;
  return (
    <div className="flex min-w-[96px] items-center justify-end gap-1 shrink-0 overflow-visible">
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
      <DeleteExpenseButton expenseId={e.id} description={e.description} mobile={mobile} />
    </div>
  );
}

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
  const base = (baseCurrency || "IDR").toUpperCase();

  const getters = useMemo(
    () => ({
      date: (r: ExpenseListItem) => r.date,
      description: (r: ExpenseListItem) => r.description.toLowerCase(),
      category: (r: ExpenseListItem) => (r.categoryName ?? "").toLowerCase(),
      project: (r: ExpenseListItem) => (r.projectName ?? "").toLowerCase(),
      client: (r: ExpenseListItem) => (r.clientName ?? "").toLowerCase(),
      amount: (r: ExpenseListItem) => Number(r.amount) || 0,
    }),
    [],
  );

  const { sorted, toggle, dirFor } = useTableSort<ExpenseListItem, SortKey>(
    rows,
    getters,
  );

  return (
    <div className="space-y-4">
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {sorted.map((e) => (
          <div
            key={e.id}
            className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs space-y-2.5 transition-all hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-foreground">{e.description}</div>
                {e.vendor && (
                  <div className="text-xs text-muted-foreground">{e.vendor}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-foreground tabular-nums">
                  {formatMoney(e.amount, e.currency)}
                </div>
                {e.amountBase != null && e.currency?.toUpperCase() !== base && (
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ≈ {formatMoney(e.amountBase, base)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px]">{e.date}</span>
                {e.categoryName && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-muted/60">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: e.categoryColor ?? "#64748b" }}
                    />
                    {e.categoryName}
                  </span>
                )}
                {(e.projectName || e.clientName) && (
                  <span className="text-[11px]">
                    {[e.projectName, e.clientName].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>

              <ExpenseActions
                e={e}
                mobile
                canWrite={canWrite}
                workspaceId={workspaceId}
                defaultCurrency={defaultCurrency}
                categories={categories}
                projects={projects}
                clients={clients}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table className="[&_td]:px-3.5 [&_td]:py-2.5 [&_th]:px-3.5 [&_th]:py-2">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
              <TableHead className="w-32">
                <SortableHeader
                  label={t("Tanggal", "Date")}
                  dir={dirFor("date")}
                  onClick={() => toggle("date")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Deskripsi", "Description")}
                  dir={dirFor("description")}
                  onClick={() => toggle("description")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Kategori", "Category")}
                  dir={dirFor("category")}
                  onClick={() => toggle("category")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortableHeader
                  label={t("Proyek", "Project")}
                  dir={dirFor("project")}
                  onClick={() => toggle("project")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <SortableHeader
                  label={t("Klien", "Client")}
                  dir={dirFor("client")}
                  onClick={() => toggle("client")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                <SortableHeader
                  label={t("Nominal", "Amount")}
                  dir={dirFor("amount")}
                  onClick={() => toggle("amount")}
                  align="right"
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="w-20 text-right text-[11px] uppercase tracking-wider">{t("Aksi", "Action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e) => (
              <TableRow
                key={e.id}
                className="border-b border-border/60 transition-colors hover:bg-muted/40"
              >
                <TableCell className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                  {e.date}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-foreground">
                    {e.description}
                  </span>
                  {e.vendor && (
                    <span className="block text-[11px] text-muted-foreground">
                      {e.vendor}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {e.categoryName ? (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/90">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: e.categoryColor ?? "#64748b" }}
                      />
                      {e.categoryName}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {e.projectName ?? "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                  {e.clientName ?? "—"}
                </TableCell>
                <TableCell className="text-right font-medium text-xs whitespace-nowrap">
                  <div className="tabular-nums">
                    {formatMoney(e.amount, e.currency)}
                  </div>
                  {e.amountBase != null && (
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      ≈ {formatMoney(e.amountBase, defaultCurrency)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {e.receiptUrl && (
                      <ReceiptLinkButton
                        expenseId={e.id}
                      />
                    )}
                    <ExpenseActions
                      e={e}
                      canWrite={canWrite}
                      workspaceId={workspaceId}
                      defaultCurrency={defaultCurrency}
                      categories={categories}
                      projects={projects}
                      clients={clients}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
