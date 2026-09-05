"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { portalLocale, portalStatusLabel } from "@/lib/portal-i18n";

export type PortalInvoice = {
  id: string;
  invoiceNumber: string | null;
  total: string | number;
  currency: string;
  status: string;
  dueDate: string | null;
  issueDate: string | null;
  projectId: string | null;
  clientFirstViewedAt?: string | null;
  isNew?: boolean;
};

type ProjectRef = { id: string; name: string };

// Status buckets: what the client actually cares about is "do I owe money?"
// Keep amounts in invoice currency only — never convert to workspace base.
const OUTSTANDING = new Set(["sent", "viewed", "overdue", "partial"]);
const PAID = new Set(["paid"]);

type StatusMeta = { label: string; className: string };

function invoiceStatusMeta(
  status: string,
  isOverdue: boolean,
  lang: "id" | "en",
): StatusMeta {
  if (isOverdue || status === "overdue") {
    return {
      label: lang === "en" ? "Overdue" : "Jatuh Tempo",
      className: "bg-red-100 text-red-700 border-red-200",
    };
  }
  switch (status) {
    case "paid":
      return {
        label: portalStatusLabel("paid", lang),
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "partial":
      return {
        label: lang === "en" ? "Partially Paid" : "Sebagian Lunas",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "sent":
      return {
        label: lang === "en" ? "Awaiting Payment" : "Menunggu Pembayaran",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "viewed":
      return {
        label: lang === "en" ? "Awaiting Payment" : "Menunggu Pembayaran",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "cancelled":
      return {
        label: portalStatusLabel("cancelled", lang),
        className: "bg-slate-100 text-slate-500 border-slate-200",
      };
    case "archived":
      return {
        label: lang === "en" ? "Archived" : "Arsip",
        className: "bg-slate-100 text-slate-500 border-slate-200",
      };
    case "draft":
      return {
        label: portalStatusLabel("draft", lang),
        className: "bg-slate-100 text-slate-500 border-slate-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

function fmtMoney(amount: number, currency: string) {
  if (currency === "IDR") {
    return `Rp${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isInvoiceOverdue(inv: PortalInvoice) {
  if (!OUTSTANDING.has(inv.status)) return false;
  if (inv.status === "overdue") return true;
  if (!inv.dueDate) return false;
  const due = new Date(inv.dueDate);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

// Sum totals per currency for a set of invoices
function sumByCurrency(list: PortalInvoice[]) {
  const map = new Map<string, number>();
  for (const inv of list) {
    const currency = (inv.currency || "IDR").toUpperCase();
    map.set(currency, (map.get(currency) || 0) + (Number(inv.total) || 0));
  }
  // Stable-ish order: IDR first, then alpha — still one line per currency
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "IDR") return -1;
      if (b === "IDR") return 1;
      return a.localeCompare(b);
    })
    .map(([currency, amount]) => ({ currency, amount }));
}

function MoneyStack({
  entries,
  className,
}: {
  entries: { currency: string; amount: number }[];
  className?: string;
}) {
  if (entries.length === 0) {
    return <span className={className}>—</span>;
  }
  return (
    <div className="flex flex-col leading-tight">
      {entries.map((e) => (
        <span key={e.currency} className={className}>
          {fmtMoney(e.amount, e.currency)}
        </span>
      ))}
    </div>
  );
}

function InvoiceRow({
  inv,
  projectName,
  token,
}: {
  inv: PortalInvoice;
  projectName: string;
  token: string;
}) {
  const { lang, t } = useT();
  const overdue = isInvoiceOverdue(inv);
  const meta = invoiceStatusMeta(inv.status, overdue, lang);
  const canDownload =
    inv.status !== "draft" &&
    inv.status !== "cancelled" &&
    inv.status !== "archived";
  const pdfUrl = `/api/client-portal/invoices/${inv.id}/pdf?token=${encodeURIComponent(token)}`;

  return (
    <div className="flex flex-col items-stretch gap-3 p-3.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold truncate text-foreground">
              {inv.invoiceNumber || "—"}
            </span>
            {inv.isNew && (
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                {t("BARU", "NEW")}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 break-words text-xs text-muted-foreground">
            {projectName} · {fmtDate(inv.issueDate, portalLocale(lang))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-foreground">
            {fmtMoney(Number(inv.total), inv.currency)}
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>
        {canDownload && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> PDF
          </a>
        )}
      </div>
    </div>
  );
}

export function PortalInvoices({
  invoices,
  projects,
  token,
}: {
  invoices: PortalInvoice[];
  projects: ProjectRef[];
  token: string;
}) {
  const { t } = useT();
  const [showPaid, setShowPaid] = useState(false);

  const projectName = (id: string | null) =>
    id
      ? projects.find((p) => p.id === id)?.name ||
        t("Tanpa proyek", "No project")
      : t("Tanpa proyek", "No project");

  const { outstanding, paid, other, outstandingSum, paidSum } = useMemo(() => {
    const sorter = (a: PortalInvoice, b: PortalInvoice) =>
      new Date(b.issueDate || b.dueDate || 0).getTime() -
      new Date(a.issueDate || a.dueDate || 0).getTime();

    const outstanding = invoices
      .filter((i) => OUTSTANDING.has(i.status))
      .sort(sorter);
    const paid = invoices.filter((i) => PAID.has(i.status)).sort(sorter);
    const other = invoices
      .filter((i) => !OUTSTANDING.has(i.status) && !PAID.has(i.status))
      .sort(sorter);

    return {
      outstanding,
      paid,
      other,
      outstandingSum: sumByCurrency(outstanding),
      paidSum: sumByCurrency(paid),
    };
  }, [invoices]);

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t("Belum ada invoice.", "No invoices yet.")}</p>
        </CardContent>
      </Card>
    );
  }

  const hasOutstanding = outstanding.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className={hasOutstanding ? "border-l-4 border-l-amber-400" : ""}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("Belum Dibayar", "Outstanding")}
            </p>
            <div className="mt-1">
              <MoneyStack
                entries={outstandingSum}
                className={`text-lg font-bold ${hasOutstanding ? "text-amber-600" : "text-foreground"}`}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {outstanding.length} invoice
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("Sudah Lunas", "Paid")}
            </p>
            <div className="mt-1">
              <MoneyStack
                entries={paidSum}
                className="text-lg font-bold text-emerald-600"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paid.length} invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding (exposed, top priority) */}
      {outstanding.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("Perlu Dibayar", "Payment Required")} ({outstanding.length})
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y">
              {outstanding.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  projectName={projectName(inv.projectId)}
                  token={token}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Other statuses (cancelled/draft that slipped through) shown inline */}
      {other.length > 0 && (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {other.map((inv) => (
              <InvoiceRow
                key={inv.id}
                inv={inv}
                projectName={projectName(inv.projectId)}
                token={token}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Paid history (collapsed by default) */}
      {paid.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPaid((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            {showPaid ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">
              Riwayat Pembayaran ({paid.length})
            </span>
          </button>
          {showPaid && (
            <Card className="mt-3 overflow-hidden">
              <div className="divide-y">
                {paid.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    inv={inv}
                    projectName={projectName(inv.projectId)}
                    token={token}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
