"use client";

import { useMemo } from "react";
import Link from "next/link";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TableHeaderFilter } from "@/components/ui/table-header-filter";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { formatMoney } from "@/lib/utils";
import { Receipt, Clock } from "lucide-react";

function formatDate(date: string | Date | null | undefined, locale: string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
import { invoiceStatusVariant } from "@/lib/status-badge";
import { billingTypeLabel } from "@/lib/feature-access";

export type InvoiceListItem = {
  id: string;
  clientId: string | null;
  invoiceNumber: string;
  clientName: string | null;
  clientCompany: string | null;
  projectName: string | null;
  billingType: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string;
  total: number | string | null;
  /** Converted total in workspace base currency (null if rate missing). */
  totalBase?: number | null;
  status: string;
};

const STATUS_ORDER = [
  "draft",
  "sent",
  "viewed",
  "overdue",
  "paid",
  "cancelled",
  "archived",
] as const;

const BILLING_ORDER = ["hours", "package", "project"] as const;

type SortKey =
  | "number"
  | "client"
  | "project"
  | "type"
  | "issueDate"
  | "dueDate"
  | "total"
  | "status";

type CurrentFilters = {
  status?: string;
  clientId?: string;
  projectId?: string;
  billing?: string;
};

function formatInvoiceId(num: string): string {
  if (/^INV-\d{4}-\d{4}$/.test(num)) return num;
  const match = num.match(/^INV-(\d{1,4})$/);
  if (!match) return num;
  const year = new Date().getFullYear();
  return `INV-${year}-${match[1].padStart(4, "0")}`;
}

export function InvoicesListTable({
  invoices,
  baseCurrency,
  clientOptions = [],
  projectOptions = [],
  currentFilters = {},
}: {
  invoices: InvoiceListItem[];
  /** Workspace base currency for secondary ≈ line. */
  baseCurrency?: string;
  clientOptions?: Array<{ id: string; name: string }>;
  projectOptions?: Array<{ id: string; name: string }>;
  currentFilters?: CurrentFilters;
}) {
  const { t, lang } = useT();
  const locale = lang === "en" ? "en-US" : "id-ID";
  const base = (baseCurrency || "IDR").toUpperCase();

  const getters = useMemo(
    () => ({
      number: (r: InvoiceListItem) => formatInvoiceId(r.invoiceNumber),
      client: (r: InvoiceListItem) => r.clientCompany || r.clientName || "",
      project: (r: InvoiceListItem) => r.projectName ?? "",
      type: (r: InvoiceListItem) => r.billingType ?? "",
      issueDate: (r: InvoiceListItem) => r.issueDate,
      dueDate: (r: InvoiceListItem) => r.dueDate,
      total: (r: InvoiceListItem) => Number(r.total) || 0,
      status: (r: InvoiceListItem) => r.status,
    }),
    [],
  );

  const orders = useMemo(
    () => ({
      status: STATUS_ORDER,
      type: BILLING_ORDER,
    }),
    [],
  );

  const { sorted, toggle, dirFor } = useTableSort<InvoiceListItem, SortKey>(
    invoices,
    getters,
    orders,
  );

  const billingOptions = useMemo(
    () => [
      { id: "hours", name: billingTypeLabel("hours", lang) },
      { id: "package", name: billingTypeLabel("package", lang) },
      { id: "project", name: billingTypeLabel("project", lang) },
      { id: "none", name: t("Tanpa proyek", "No project") },
    ],
    [lang, t],
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs md:block">
        <Table className="[&_td]:px-3.5 [&_td]:py-2 [&_th]:px-3.5 [&_th]:py-2">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
              <TableHead className="w-40">
                <SortableHeader
                  label={t("No. Invoice", "Invoice No.")}
                  dir={dirFor("number")}
                  onClick={() => toggle("number")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <TableHeaderFilter
                  label={t("Klien", "Client")}
                  queryKey="clientId"
                  value={currentFilters.clientId}
                  basePath="/app/invoices"
                  options={[
                    { value: "all", label: t("Semua klien", "All clients") },
                    ...clientOptions.map((client) => ({ value: client.id, label: client.name })),
                  ]}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <TableHeaderFilter
                  label={t("Proyek", "Project")}
                  queryKey="projectId"
                  value={currentFilters.projectId}
                  basePath="/app/invoices"
                  options={[
                    { value: "all", label: t("Semua proyek", "All projects") },
                    ...projectOptions.map((project) => ({ value: project.id, label: project.name })),
                  ]}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <TableHeaderFilter
                  label={t("Jenis", "Type")}
                  queryKey="billing"
                  value={currentFilters.billing}
                  basePath="/app/invoices"
                  options={[
                    { value: "all", label: t("Semua jenis", "All types") },
                    ...billingOptions.map((option) => ({ value: option.id, label: option.name })),
                  ]}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="w-36">
                <SortableHeader
                  label={t("Tanggal", "Dates")}
                  dir={dirFor("issueDate")}
                  onClick={() => toggle("issueDate")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                <SortableHeader
                  label={t("Total", "Total")}
                  dir={dirFor("total")}
                  onClick={() => toggle("total")}
                  align="right"
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="w-24">
                <SortableHeader
                  label={t("Status", "Status")}
                  dir={dirFor("status")}
                  onClick={() => toggle("status")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((inv) => {
              const status = invoiceStatusVariant(inv.status, lang);
              return (
                <TableRow
                  key={inv.id}
                  className="border-b border-border transition-colors hover:bg-muted/40"
                >
                  <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Receipt className="h-3 w-3" />
                      </div>
                      <Link href={buildInvoiceDetailUrl(inv.id, { type: "global" })} className="text-primary hover:underline font-bold">
                        {formatInvoiceId(inv.invoiceNumber)}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    {inv.clientId ? (
                      <Link href={`/app/clients/${inv.clientId}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[14rem]">
                        {inv.clientCompany || inv.clientName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-foreground block truncate max-w-[14rem]">
                        {inv.clientCompany || inv.clientName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[10rem] truncate text-sm text-muted-foreground">
                    {inv.projectName || "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {inv.billingType ? (
                      <Badge variant="outline" className="font-medium text-[9px] px-1.5 py-0 rounded bg-muted/60 text-muted-foreground border-border/60">
                        {billingTypeLabel(inv.billingType, lang)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{formatDate(inv.issueDate, locale)}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {t("Jatuh tempo", "Due")}: {formatDate(inv.dueDate, locale)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-sm whitespace-nowrap">
                    <div className="text-foreground">{formatMoney(inv.total, inv.currency)}</div>
                    {inv.totalBase != null && inv.currency !== base && (
                      <div className="text-[11px] text-muted-foreground font-mono">
                        ≈ {formatMoney(inv.totalBase, base)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[10px] font-medium rounded-full px-2 py-0 h-5 ${
                        inv.status === "paid"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : inv.status === "sent" || inv.status === "viewed"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : inv.status === "overdue"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : "border-border/80 bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${
                          inv.status === "paid"
                            ? "bg-emerald-600"
                            : inv.status === "sent" || inv.status === "viewed"
                            ? "bg-blue-600"
                            : inv.status === "overdue"
                            ? "bg-rose-600"
                            : "bg-muted-foreground"
                        }`}
                      />
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden space-y-3">
        {sorted.map((inv) => {
          const status = invoiceStatusVariant(inv.status, lang);
          return (
            <div key={inv.id} className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-xs transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Receipt className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={buildInvoiceDetailUrl(inv.id, { type: "global" })}
                      className="font-mono text-sm font-semibold hover:underline text-primary block truncate"
                    >
                      {formatInvoiceId(inv.invoiceNumber)}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {inv.clientCompany || inv.clientName}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`gap-1 text-[10px] font-medium rounded-full px-2 py-0 h-5 shrink-0 ${
                    inv.status === "paid"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : inv.status === "sent" || inv.status === "viewed"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : inv.status === "overdue"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      : "border-border/80 bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      inv.status === "paid"
                        ? "bg-emerald-600"
                        : inv.status === "sent" || inv.status === "viewed"
                        ? "bg-blue-600"
                        : inv.status === "overdue"
                        ? "bg-rose-600"
                        : "bg-muted-foreground"
                    }`}
                  />
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                <div className="text-sm font-semibold text-foreground tabular-nums">
                  {formatMoney(inv.total, inv.currency)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(inv.dueDate, locale)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
