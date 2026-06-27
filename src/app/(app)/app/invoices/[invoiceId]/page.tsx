import { getWorkspaceForCurrentUser, getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  payments,
  clients,
  workspaces,
  timeEntries,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share2, Clock } from "lucide-react";
import { InvoiceItemManager } from "./add-item-button";
import { DeleteItemButton } from "./delete-item-button";
import { ImportTimeSection } from "./import-time-section";
import { PaymentSection } from "./payment-section";
import { ShareTokenSection } from "./share-token-section";
import { formatDateID, formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
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
    case "payment due":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!inv) notFound();

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  // Fetch unbilled time entries for this client
  const unbilledTimeEntries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      durationMinutes: timeEntries.durationMinutes,
      hourlyRate: timeEntries.hourlyRate,
      startTime: timeEntries.startTime,
      status: timeEntries.status,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        eq(timeEntries.clientId, inv.clientId),
        eq(timeEntries.billable, true),
      ),
    )
    .limit(200);

  const unbilled = unbilledTimeEntries.filter((t) => t.status !== "invoiced");

  const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);

  const hasShareToken = inv.sharedTokenHash && !inv.sharedTokenRevokedAt;
  const shareExpired = inv.sharedTokenExpiresAt
    ? new Date(inv.sharedTokenExpiresAt) < new Date()
    : false;

  const isPaid = Number(inv.total) > 0 && totalPaid >= Number(inv.total);
  const displayStatus = inv.status === "paid" && !isPaid ? "payment due" : inv.status;

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice {inv.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client ? client.companyName || client.name : "Unknown Client"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={statusVariant(displayStatus)}
            className="text-sm px-3 py-1"
          >
            {invoiceStatusVariant(displayStatus).label}
          </Badge>
          {isPaid && inv.status !== "paid" && (
            <Badge variant="default" className="text-sm px-3 py-1">
              Lunas
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Tanggal Terbit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {formatDateID(inv.issueDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Jatuh Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {formatDateID(inv.dueDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Mata Uang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{inv.currency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold font-mono">
              {formatMoney(inv.total, inv.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rincian Item</CardTitle>
          <InvoiceItemManager invoiceId={invoiceId} />
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Belum ada item. Tambahkan item ke invoice ini.
            </p>
          ) : (
            <div className="space-y-0">
              <div className="flex items-center gap-2 py-2 text-xs uppercase text-muted-foreground border-b sm:gap-4">
                <div className="min-w-0 flex-1">Deskripsi</div>
                <div className="w-14 text-right sm:w-20">Qty</div>
                <div className="w-20 text-right sm:w-28">Tarif</div>
                <div className="w-20 text-right sm:w-28">Jumlah</div>
                <div className="w-6 sm:w-10" />
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-2 border-b last:border-0 text-sm sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.description}</p>
                    {item.sourceType === "time_entry" && (
                      <span className="text-xs text-muted-foreground">
                        (dari catatan waktu)
                      </span>
                    )}
                  </div>
                  <div className="w-14 text-right sm:w-20">
                    {Number(item.quantity).toFixed(2)}
                  </div>
                  <div className="w-20 text-right font-mono sm:w-28">
                    {formatMoney(item.unitPrice, inv.currency)}
                  </div>
                  <div className="w-20 text-right font-mono font-medium sm:w-28">
                    {formatMoney(item.amount, inv.currency)}
                  </div>
                  <div className="w-6 text-right sm:w-10">
                    <DeleteItemButton itemId={item.id} />
                  </div>
                </div>
              ))}

              <Separator className="my-2" />
              <div className="space-y-1 pt-2">
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono w-28 text-right">
                    {formatMoney(inv.subtotal, inv.currency)}
                  </span>
                </div>
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-muted-foreground">Pajak</span>
                  <span className="font-mono w-28 text-right">
                    {formatMoney(inv.tax, inv.currency)}
                  </span>
                </div>
                <div className="flex justify-end gap-8 text-base font-bold pt-1">
                  <span>Total</span>
                  <span className="font-mono w-28 text-right">
                    {formatMoney(inv.total, inv.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Import Catatan Waktu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImportTimeSection invoiceId={invoiceId} timeEntries={unbilled} />
        </CardContent>
      </Card>

      {/* Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle>Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentSection
            invoiceId={invoiceId}
            payments={pays.map((p) => ({
              ...p,
              paidAt: p.paidAt ? String(p.paidAt) : null,
              createdAt: String(p.createdAt),
            }))}
            total={Number(inv.total)}
            currency={inv.currency}
          />
        </CardContent>
      </Card>

      {/* Share Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Link Berbagi Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShareTokenSection
            invoiceId={invoiceId}
            hasToken={!!hasShareToken}
            isExpired={shareExpired}
          />
        </CardContent>
      </Card>

      {/* Catatan & Syarat */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {inv.notes && (
            <div>
              <h4 className="text-sm font-medium mb-1">Catatan</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {inv.notes}
              </p>
            </div>
          )}
          {inv.terms && (
            <div>
              <h4 className="text-sm font-medium mb-1">Syarat</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {inv.terms}
              </p>
            </div>
          )}
          {!inv.notes && !inv.terms && (
            <p className="text-sm text-muted-foreground">
              Belum ada catatan atau syarat.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
