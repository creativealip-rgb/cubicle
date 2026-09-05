import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { ProjectInvoiceCreateDialog } from "@/components/invoices/project-invoice-create-dialog";
import { RetainerProjectInvoiceActions, type RetainerPeriodView } from "@/components/invoices/retainer-project-invoice-actions";
import { getCurrentLang, createT } from "@/lib/i18n";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { FileSpreadsheet } from "lucide-react";

export type ProjectBillingInvoice = { id: string; invoiceNumber: string; issueDate: string; dueDate: string | null; currency: string; total: string; status: string };
type DialogProject = Parameters<typeof ProjectInvoiceCreateDialog>[0]["project"];
type DialogClient = Parameters<typeof ProjectInvoiceCreateDialog>[0]["client"];

export async function ProjectBillingTab({
  project,
  invoices,
  retainerPeriod = null,
}: {
  project: DialogProject;
  client?: DialogClient;
  invoices: ProjectBillingInvoice[];
  baseCurrency?: string;
  currencyRates?: Array<{ fromCurrency: string; rate: string }>;
  proposedInvoiceNumber?: string;
  retainerPeriod?: RetainerPeriodView | null;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  return (
    <div className="space-y-4">
      {project.billingType === "retainer" && retainerPeriod ? (
        <RetainerProjectInvoiceActions projectId={project.id} period={retainerPeriod} renderSummaryOnly />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card divide-y divide-border shadow-xs">
        {invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("Belum ada invoice untuk proyek ini.", "No invoices for this project yet.")}
          </p>
        ) : (
          invoices.map((invoice) => {
            const statusInfo = invoiceStatusVariant(invoice.status, lang);
            return (
              <Link
                key={invoice.id}
                href={buildInvoiceDetailUrl(invoice.id, { type: "project", resourceId: project.id })}
                className="flex flex-col gap-2 p-3.5 sm:p-4 hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.issueDate}
                      {invoice.dueDate ? ` · ${t("jatuh tempo", "due")} ${invoice.dueDate}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold h-5 px-2 rounded-full border ${
                      invoice.status === "paid"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : invoice.status === "overdue"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    <span
                      className={`mr-1 h-1.5 w-1.5 rounded-full ${
                        invoice.status === "paid"
                          ? "bg-emerald-500"
                          : invoice.status === "overdue"
                            ? "bg-rose-500"
                            : "bg-blue-600"
                      }`}
                    />
                    {statusInfo.label}
                  </Badge>
                  <span className="text-sm font-mono font-bold tabular-nums text-foreground">
                    {formatMoney(invoice.total, invoice.currency)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
