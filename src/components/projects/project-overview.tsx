import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export function ProjectOverview({ project, progress, trackedMinutes, billableAmount, invoicedAmount, outstandingAmount, budgetUsed, recentTime, recentInvoices, recentFiles, locale, t }: any) {
  const kpis = [
    [t("Jam Tercatat", "Tracked Hours"), `${Math.floor(trackedMinutes / 60)}h ${trackedMinutes % 60}m`],
    [t("Progres Tugas", "Task Progress"), `${progress.done}/${progress.total} · ${progress.percent}%`],
    [t("Nilai Tagihan", "Billable Amount"), formatMoney(billableAmount, project.currency)],
    [t("Belum Ditagih", "Outstanding"), formatMoney(outstandingAmount, project.currency)],
  ];
  const section = (title: string, items: any[], href: string, render: (item: any) => React.ReactNode) => <Card className="h-full rounded-xl"><CardContent className="flex h-full min-h-56 flex-col p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">{title}</h3><Link href={href} className="text-xs font-medium text-primary hover:underline">{t("Lihat semua", "View all")}</Link></div><div className="divide-y">{items.length ? items.map(render) : <p className="py-8 text-center text-sm text-muted-foreground">{t("Belum ada data", "No data yet")}</p>}</div></CardContent></Card>;
  const billingLabel = project.billingModel === "retainer" ? "Retainer" : project.billingModel === "hourly" || project.billingType === "hours" ? t("Per Jam", "Hourly") : t("Harga Tetap", "Fixed Price");
  const budget = Number(project.billingModel === "retainer" ? project.retainerFee : project.budget) || 0;
  const usedPercent = budget > 0 ? Math.min(100, Math.round((budgetUsed / budget) * 100)) : 0;
  return <div className="space-y-4">
    <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 lg:grid-cols-4">{kpis.map(([label,value])=><div key={label} className="border-b p-4 last:border-0 sm:border-r lg:border-b-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl font-bold tabular-nums">{value}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-xl"><CardContent className="p-4"><h3 className="mb-4 text-sm font-bold">{t("Detail Proyek", "Project Details")}</h3><dl className="space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Client</dt><dd className="font-medium">{project.clientName || t("Tanpa klien", "No client")}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Dibuat", "Created")}</dt><dd>{new Date(project.createdAt).toLocaleDateString(locale)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Jatuh tempo", "Due date")}</dt><dd>{project.dueDate ? new Date(project.dueDate).toLocaleDateString(locale) : "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Status</dt><dd><Badge variant="outline">{project.status}</Badge></dd></div><div><dt className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</dt><dd>{project.description || t("Tidak ada deskripsi", "No description")}</dd></div></dl></CardContent></Card>
      <Card className="rounded-xl"><CardContent className="p-4"><h3 className="mb-4 text-sm font-bold">Billing</h3><p className="text-xs text-muted-foreground">{billingLabel}</p><p className="mt-1 font-mono text-xl font-bold">{project.billingModel === "hourly" || project.billingType === "hours" ? `${formatMoney(project.rate || 0, project.currency)}/${t("jam", "hr")}` : formatMoney(budget, project.currency)}</p><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>{t("Tertagih", "Invoiced")}</span><strong className="font-mono">{formatMoney(invoicedAmount, project.currency)}</strong></div><div className="flex justify-between"><span>{t("Belum dibayar", "Outstanding")}</span><strong className="font-mono">{formatMoney(outstandingAmount, project.currency)}</strong></div></div><Link href={`?tab=billing`} className="mt-4 inline-block text-xs font-medium text-primary hover:underline">{t("Kelola invoice", "Manage invoices")}</Link></CardContent></Card>
      <Card className="rounded-xl"><CardContent className="p-4"><h3 className="mb-4 text-sm font-bold">Budget</h3><p className="font-mono text-xl font-bold">{budget ? formatMoney(budget, project.currency) : "—"}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${usedPercent >= 90 ? "bg-rose-500" : usedPercent >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{width:`${usedPercent}%`}} /></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{t("Terpakai", "Used")} {usedPercent}%</span><span>{formatMoney(Math.max(0,budget-budgetUsed), project.currency)} {t("tersisa", "left")}</span></div></CardContent></Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {section(t("Log Waktu Terbaru", "Recent Time Logs"), recentTime, "?tab=time", (x)=><div key={x.id} className="flex justify-between py-3 text-sm"><span className="truncate">{x.description || x.taskTitle || t("Tanpa judul", "Untitled")}</span><strong className="font-mono">{Math.round(x.durationMinutes || 0)}m</strong></div>)}
      {section(t("Invoice Terbaru", "Recent Invoices"), recentInvoices, "?tab=billing", (x)=><div key={x.id} className="flex justify-between py-3 text-sm"><span>{x.invoiceNumber}</span><strong className="font-mono">{formatMoney(x.total,x.currency)}</strong></div>)}
      {section(t("Berkas Terbaru", "Recent Files"), recentFiles, "?tab=files", (x)=><div key={x.id} className="py-3 text-sm"><span className="truncate">{x.name}</span></div>)}
    </div>
  </div>;
}
