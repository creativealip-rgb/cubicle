import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoices, workspaceMembers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireUser } from "@/lib/access";
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
import { Plus, FileText, Eye } from "lucide-react";
import { formatDateID, formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { EmptyState } from "@/components/empty-state";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function formatInvoiceId(num: string): string {
  if (/^INV-\d{4}-\d{4}$/.test(num)) return num;

  const match = num.match(/^INV-(\d{1,4})$/);
  if (!match) return num;

  const year = new Date().getFullYear();
  return `INV-${year}-${match[1].padStart(4, "0")}`;
}

export default async function InvoicesPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  const invoiceList = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientCompany: clients.companyName,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(invoices.workspaceId, workspaceId))
    .orderBy(desc(invoices.createdAt));

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Invoice", "Invoices")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Buat dan kelola invoice untuk klienmu", "Create and manage invoices for your clients")}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/app/invoices/templates">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> {t("Template", "Templates")}
            </Button>
          </Link>
          {canWrite && (
            <Link href="/app/invoices/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> {t("Invoice Baru", "New Invoice")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {invoiceList.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("Belum ada invoice", "No invoices yet")}
          description={t("Buat invoice pertama untuk mulai tagih klienmu.", "Create your first invoice to start billing clients.")}
          action={canWrite ? { label: t("Buat Invoice", "Create Invoice"), href: "/app/invoices/new" } : undefined}
        />
      ) : (
        <>
        <div className="hidden md:block border rounded-lg overflow-x-auto min-w-0 max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("No.", "No.")}</TableHead>
                <TableHead>{t("Klien", "Client")}</TableHead>
                <TableHead>{t("Tanggal Terbit", "Issue Date")}</TableHead>
                <TableHead>{t("Jatuh Tempo", "Due Date")}</TableHead>
                <TableHead className="text-right">{t("Total", "Total")}</TableHead>
                <TableHead>{t("Status", "Status")}</TableHead>
                <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceList.map((inv) => {
                const status = invoiceStatusVariant(inv.status, lang);
                return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {formatInvoiceId(inv.invoiceNumber)}
                  </TableCell>
                  <TableCell>{inv.clientCompany || inv.clientName}</TableCell>
                  <TableCell>
                    {formatDateID(inv.issueDate)}
                  </TableCell>
                  <TableCell>
                    {formatDateID(inv.dueDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(inv.total, inv.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
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
          {invoiceList.map((inv) => {
            const status = invoiceStatusVariant(inv.status, lang);
            return (
              <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/app/invoices/${inv.id}`} className="font-mono text-sm font-medium hover:underline">
                      {formatInvoiceId(inv.invoiceNumber)}
                    </Link>
                    <div className="text-sm text-muted-foreground truncate">
                      {inv.clientCompany || inv.clientName}
                    </div>
                  </div>
                  <Badge variant={status.variant} className="shrink-0">
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{t("Total", "Total")}</span>
                  <span className="tabular-nums font-medium">{formatMoney(inv.total, inv.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{t("Jatuh Tempo", "Due Date")}</span>
                  <span className="text-sm">
                    {formatDateID(inv.dueDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
