import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock3, FolderKanban, Receipt, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export function ClientOverview({ client, projects, invoices, editAction, projectAction, invoiceAction, t }: {
  client: { id: string; clientNumber: string | null; email: string | null; phone: string | null; website: string | null; address: string | null; tags: string[] | null; internalNotes: string | null; portalSlug: string | null; portalSlugEnabled: boolean };
  projects: Array<{ id: string; name: string; status: string; trackedMinutes: number; taskCount: number; doneCount: number }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; dueDate: string | null; total: string; currency: string }>;
  editAction: React.ReactNode; projectAction?: React.ReactNode; invoiceAction?: React.ReactNode;
  t: (id: string, en: string) => string;
}) {
  return <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="rounded-xl"><CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">{t("Detail Klien", "Client Details")}</h2>
        <dl className="space-y-2 text-sm">
          {client.clientNumber && <Detail label={t("ID Klien", "Client ID")} value={client.clientNumber} />}
          {client.email && <Detail label="Email" value={client.email} />}
          {client.phone && <Detail label={t("Telepon", "Phone")} value={client.phone} />}
          {client.website && <Detail label="Website" value={client.website} />}
          {client.address && <Detail label={t("Alamat", "Address")} value={client.address} />}
        </dl>
        {client.tags?.length ? <div className="flex flex-wrap gap-1">{client.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div> : null}
        {client.internalNotes && <div className="border-t pt-3"><p className="text-[11px] font-semibold uppercase text-muted-foreground">{t("Catatan Internal", "Internal Notes")}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed">{client.internalNotes}</p></div>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3">{editAction}{client.portalSlugEnabled && client.portalSlug ? <Button variant="link" size="sm" className="h-auto p-0" asChild><Link href={`/client-portal/${client.portalSlug}`} target="_blank">{t("Buka Portal Klien", "Open Client Portal")}</Link></Button> : null}</div>
      </CardContent></Card>
      <OverviewList title={t("Project Terbaru", "Recent Projects")} href={`?tab=projects`} empty={t("Belum ada project", "No projects yet")} action={projectAction} t={t}>
        {projects.slice(0, 5).map((p) => <Link key={p.id} href={`/app/projects/${p.id}?from=client`} className="flex items-center justify-between gap-3 border-b py-3 last:border-0 hover:text-primary"><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.doneCount}/{p.taskCount} {t("task", "tasks")} · {(p.trackedMinutes / 60).toFixed(1)}h</p></div><Badge variant="outline" className="text-[10px]">{p.status}</Badge></Link>)}
      </OverviewList>
      <OverviewList title={t("Invoice Terbaru", "Recent Invoices")} href={`?tab=invoices`} empty={t("Belum ada invoice", "No invoices yet")} action={invoiceAction} t={t}>
        {invoices.slice(0, 5).map((inv) => <Link key={inv.id} href={`/app/invoices/${inv.id}`} className="flex items-center justify-between gap-3 border-b py-3 last:border-0 hover:text-primary"><div className="min-w-0"><p className="text-sm font-semibold">{inv.invoiceNumber}</p><p className="text-xs text-muted-foreground">{inv.dueDate ? `${t("Tenggat", "Due")} ${inv.dueDate}` : t("Tanpa tenggat", "No due date")}</p></div><div className="text-right"><p className="font-mono text-xs font-bold">{formatMoney(inv.total, inv.currency)}</p><p className="text-[10px] text-muted-foreground">{inv.status}</p></div></Link>)}
      </OverviewList>
    </div>
  </div>;
}
export function ClientKpis({ activeProjects, currency, trackedMinutes, outstanding, invoiced, t }: { activeProjects: number; currency: string; trackedMinutes: number; outstanding: number; invoiced: number; t: (id: string, en: string) => string }) {
  const metrics = [
    [t("Proyek Aktif", "Active Projects"), String(activeProjects), FolderKanban],
    [t("Waktu Tercatat", "Tracked Hours"), `${(trackedMinutes / 60).toFixed(1)}h`, Clock3],
    [t("Belum Dibayar", "Outstanding"), formatMoney(outstanding, currency), Wallet],
    [t("Total Invoice", "Invoiced Total"), formatMoney(invoiced, currency), Receipt],
  ] as const;
  return <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4">
    {metrics.map(([label, value, Icon], index) => <div key={label} className={`flex items-center gap-3 p-4 ${index ? "border-t sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate text-lg font-bold tabular-nums">{value}</p></div>
    </div>)}
  </div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-medium text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value}</dd></div>; }
function OverviewList({ title, href, empty, action, children, t }: { title: string; href: string; empty: string; action?: React.ReactNode; children: React.ReactNode; t: (id: string, en: string) => string }) { const has = Array.isArray(children) ? children.length > 0 : Boolean(children); return <Card className="h-full rounded-xl"><CardContent className="flex h-full min-h-64 flex-col p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{title}</h2><Button variant="ghost" size="sm" asChild><Link href={href}>{t("Lihat semua", "View all")}</Link></Button></div><div className="flex-1">{has ? children : <div className="flex h-full min-h-36 items-center justify-center text-center"><p className="text-sm text-muted-foreground">{empty}</p></div>}</div>{action && <div className="mt-auto border-t pt-3">{action}</div>}</CardContent></Card>; }
