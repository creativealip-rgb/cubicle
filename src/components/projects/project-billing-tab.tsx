import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { ProjectInvoiceCreateDialog } from "@/components/invoices/project-invoice-create-dialog";
import { RetainerProjectInvoiceActions, type RetainerPeriodView } from "@/components/invoices/retainer-project-invoice-actions";
import { getCurrentLang, createT } from "@/lib/i18n";

export type ProjectBillingInvoice = { id: string; invoiceNumber: string; issueDate: string; dueDate: string | null; currency: string; total: string; status: string };
type DialogProject = Parameters<typeof ProjectInvoiceCreateDialog>[0]["project"];
type DialogClient = Parameters<typeof ProjectInvoiceCreateDialog>[0]["client"];

export async function ProjectBillingTab({ project, client, invoices, baseCurrency, currencyRates, proposedInvoiceNumber, retainerPeriod = null }: { project: DialogProject; client: DialogClient; invoices: ProjectBillingInvoice[]; baseCurrency: string; currencyRates: Array<{ fromCurrency: string; rate: string }>; proposedInvoiceNumber: string; retainerPeriod?: RetainerPeriodView | null }) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">{t("Invoice terkait", "Related Invoices")}</h3>
      {project.billingType === "retainer" ? (
        <RetainerProjectInvoiceActions projectId={project.id} period={retainerPeriod} proposedInvoiceNumber={proposedInvoiceNumber} />
      ) : (
        <ProjectInvoiceCreateDialog project={project} client={client} baseCurrency={baseCurrency} proposedInvoiceNumber={proposedInvoiceNumber} currencyRates={currencyRates} />
      )}
    </div>
    {project.billingType === "retainer" && retainerPeriod ? (
      <RetainerProjectInvoiceActions projectId={project.id} period={retainerPeriod} renderSummaryOnly />
    ) : null}
    <div className="overflow-hidden rounded-lg border bg-card">
      {invoices.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{t("Belum ada invoice untuk proyek ini.", "No invoices for this project yet.")}</p> : invoices.map((invoice) => <Link key={invoice.id} href={buildInvoiceDetailUrl(invoice.id, { type: "project", resourceId: project.id })} className="grid gap-2 border-b p-4 last:border-b-0 hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div><p className="text-sm font-medium">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{invoice.issueDate}{invoice.dueDate ? ` · ${t("jatuh tempo", "due")} ${invoice.dueDate}` : ""}</p></div>
        <Badge variant="outline">{invoice.status}</Badge>
        <span className="text-sm font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency)}</span>
      </Link>)}
    </div>
  </div>;
}
