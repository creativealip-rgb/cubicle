import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoices, workspaces, workspaceMembers } from "@/db/schema";
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

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

function formatInvoiceId(num: string): string {
  if (/^INV-\d{4}-\d{4}$/.test(num)) return num;

  const match = num.match(/^INV-(\d{1,4})$/);
  if (!match) return num;

  const year = new Date().getFullYear();
  return `INV-${year}-${match[1].padStart(4, "0")}`;
}

export default async function InvoicesPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Buat dan kelola invoice untuk klienmu
          </p>
        </div>
        {canWrite && (
          <Link href="/app/invoices/new">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Invoice Baru
            </Button>
          </Link>
        )}
      </div>

      {invoiceList.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada invoice"
          description="Buat invoice pertama untuk mulai tagih klienmu."
          action={canWrite ? { label: "Buat Invoice", href: "/app/invoices/new" } : undefined}
        />
      ) : (
        <>
        <div className="hidden md:block border rounded-lg overflow-x-auto min-w-0 max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Klien</TableHead>
                <TableHead>Tanggal Terbit</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceList.map((inv) => {
                const status = invoiceStatusVariant(inv.status);
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
            const status = invoiceStatusVariant(inv.status);
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
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="tabular-nums font-medium">{formatMoney(inv.total, inv.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Jatuh Tempo</span>
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
