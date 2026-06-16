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

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
      return "secondary";
    case "viewed":
      return "secondary";
    case "overdue":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
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
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage invoices for your clients
          </p>
        </div>
        {canWrite && (
          <Link href="/app/invoices/new">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
        )}
      </div>

      {invoiceList.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first invoice to start billing your clients.
          </p>
          {canWrite && (
            <Link href="/app/invoices/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Invoice
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto min-w-0 max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceList.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>{inv.clientCompany || inv.clientName}</TableCell>
                  <TableCell>
                    {inv.issueDate
                      ? new Date(inv.issueDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: inv.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Number(inv.total))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(inv.status)}>
                      {inv.status}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
