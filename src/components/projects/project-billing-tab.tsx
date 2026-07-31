import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export type ProjectBillingInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  total: string;
  status: string;
};

type ProjectBillingSummary = {
  model: string;
  label: string;
  currency: string;
  budget: string | null;
  hourlyRate: string | null;
  retainerFee: string | null;
  retainerIncludedMinutes: number | null;
};

export function ProjectBillingTab({ projectId, summary, invoices }: {
  projectId: string;
  summary: ProjectBillingSummary;
  invoices: ProjectBillingInvoice[];
}) {
  const amount = summary.model === "fixed_price"
    ? summary.budget
    : summary.model === "retainer"
      ? summary.retainerFee
      : summary.hourlyRate;
  const amountLabel = summary.model === "fixed_price"
    ? "Nilai proyek"
    : summary.model === "retainer"
      ? "Biaya retainer"
      : "Tarif per jam";

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Model billing</CardTitle></CardHeader><CardContent><Badge variant="outline">{summary.label}</Badge></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{amountLabel}</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{amount ? formatMoney(amount, summary.currency) : "—"}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Mata uang</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{summary.currency}</CardContent></Card>
    </div>
    {summary.model === "retainer" && summary.retainerIncludedMinutes ? <p className="text-sm text-muted-foreground">Termasuk {(summary.retainerIncludedMinutes / 60).toLocaleString("id-ID")} jam per bulan.</p> : null}
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">Invoice terkait</h3>
      <Button asChild size="sm"><Link href={`/app/invoices/new?projectId=${projectId}`}>Buat Invoice</Link></Button>
    </div>
    <div className="overflow-hidden rounded-lg border bg-card">
      {invoices.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Belum ada invoice untuk proyek ini.</p> : invoices.map((invoice) => <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="grid gap-2 border-b p-4 last:border-b-0 hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div><p className="text-sm font-medium">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{invoice.issueDate}{invoice.dueDate ? ` · jatuh tempo ${invoice.dueDate}` : ""}</p></div>
        <Badge variant="outline">{invoice.status}</Badge>
        <span className="text-sm font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency)}</span>
      </Link>)}
    </div>
  </div>;
}
