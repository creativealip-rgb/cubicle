"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { formatDateID, formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { billingTypeLabel } from "@/lib/feature-access";

export type InvoiceListItem = {
  id: string;
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
}: {
  invoices: InvoiceListItem[];
  /** Workspace base currency for secondary ≈ line. */
  baseCurrency?: string;
}) {
  const { t, lang } = useT();
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

  return (
    <>
      <div className="hidden md:block border rounded-lg overflow-x-auto min-w-0 max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label={t("No.", "No.")}
                  dir={dirFor("number")}
                  onClick={() => toggle("number")}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Klien", "Client")}
                  dir={dirFor("client")}
                  onClick={() => toggle("client")}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Proyek", "Project")}
                  dir={dirFor("project")}
                  onClick={() => toggle("project")}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Jenis", "Type")}
                  dir={dirFor("type")}
                  onClick={() => toggle("type")}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Tanggal Terbit", "Issue Date")}
                  dir={dirFor("issueDate")}
                  onClick={() => toggle("issueDate")}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Jatuh Tempo", "Due Date")}
                  dir={dirFor("dueDate")}
                  onClick={() => toggle("dueDate")}
                />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader
                  label={t("Total", "Total")}
                  dir={dirFor("total")}
                  onClick={() => toggle("total")}
                  align="right"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Status", "Status")}
                  dir={dirFor("status")}
                  onClick={() => toggle("status")}
                />
              </TableHead>
              <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((inv) => {
              const status = invoiceStatusVariant(inv.status, lang);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {formatInvoiceId(inv.invoiceNumber)}
                  </TableCell>
                  <TableCell>{inv.clientCompany || inv.clientName}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                    {inv.projectName || "—"}
                  </TableCell>
                  <TableCell>
                    {inv.billingType ? (
                      <Badge variant="outline" className="font-normal">
                        {billingTypeLabel(inv.billingType, lang)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDateID(inv.issueDate)}</TableCell>
                  <TableCell>{formatDateID(inv.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    <div>{formatMoney(inv.total, inv.currency)}</div>
                    {inv.totalBase != null &&
                      inv.currency?.toUpperCase() !== base && (
                        <div className="text-xs font-normal text-muted-foreground">
                          ≈ {formatMoney(inv.totalBase, base)}
                        </div>
                      )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/app/invoices/${inv.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
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
            <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/app/invoices/${inv.id}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {formatInvoiceId(inv.invoiceNumber)}
                  </Link>
                  <div className="text-sm text-muted-foreground truncate">
                    {inv.clientCompany || inv.clientName}
                  </div>
                  {(inv.projectName || inv.billingType) && (
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      {inv.projectName || "—"}
                      {inv.billingType
                        ? ` · ${billingTypeLabel(inv.billingType, lang)}`
                        : ""}
                    </div>
                  )}
                </div>
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {t("Total", "Total")}
                </span>
                <div className="text-right">
                  <div className="tabular-nums font-medium">
                    {formatMoney(inv.total, inv.currency)}
                  </div>
                  {inv.totalBase != null &&
                    inv.currency?.toUpperCase() !== base && (
                      <div className="text-xs text-muted-foreground">
                        ≈ {formatMoney(inv.totalBase, base)}
                      </div>
                    )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {t("Jatuh Tempo", "Due Date")}
                </span>
                <span className="text-sm">{formatDateID(inv.dueDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
