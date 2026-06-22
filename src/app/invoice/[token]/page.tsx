import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getInvoiceBySharedToken } from "@/lib/actions/invoices";
import { logPortalAccess } from "@/lib/actions/portal";
import { Badge } from "@/components/ui/badge";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatCurrency(amount: string | number, currency: string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
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

export default async function SharedInvoicePage({
  params,
  // eslint-disable-next-line unused-imports/no-unused-vars
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { token } = await params;

  let invoice;
  try {
    invoice = await getInvoiceBySharedToken(token);
  } catch {
    notFound();
  }

  // Log portal access
  try {
    const headersList = await headers();
    await logPortalAccess({
      workspaceId: invoice.workspace?.id || null,
      clientId: invoice.client?.id || null,
      invoiceId: invoice.id,
      tokenType: "invoice_share",
      tokenHashPrefix: token.slice(0, 8),
      ipAddress: headersList.get("x-forwarded-for") || undefined,
      userAgent: headersList.get("user-agent") || undefined,
    });
  } catch {
    // Non-critical
  }

  if (invoice.status === "sent") {
    try {
      await db
        .update(invoices)
        .set({ status: "viewed", updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
      invoice.status = "viewed";
    } catch {
      // Non-critical
    }
  }

  const { items, client, workspace } = invoice;
  const sub = Number(invoice.subtotal);
  const tax = Number(invoice.tax);
  const total = Number(invoice.total);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Company Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {workspace && (
              <>
                <h1 className="text-2xl font-bold">
                  {workspace.billingName || "Company"}
                </h1>
                {workspace.billingAddress && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {workspace.billingAddress}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold tracking-tight">INVOICE</h2>
            <p className="text-lg font-mono text-primary mt-1">
              {invoice.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Issue Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {invoice.issueDate
                  ? new Date(invoice.issueDate).toLocaleDateString()
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Due Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString()
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Currency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{invoice.currency}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={statusVariant(invoice.status)}>
                {invoice.status}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Bill To */}
        {client && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Bill To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {client.companyName || client.name}
              </p>
              {client.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.address}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No items on this invoice.
              </p>
            ) : (
              <div>
                <div className="flex items-center gap-4 py-2 text-xs uppercase text-muted-foreground border-b mb-2">
                  <div className="flex-1">Description</div>
                  <div className="w-20 text-right">Qty</div>
                  <div className="w-28 text-right">Rate</div>
                  <div className="w-28 text-right">Amount</div>
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 py-2 border-b last:border-0 text-sm"
                  >
                    <div className="flex-1">{item.description}</div>
                    <div className="w-20 text-right">
                      {Number(item.quantity).toFixed(2)}
                    </div>
                    <div className="w-28 text-right font-mono">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </div>
                    <div className="w-28 text-right font-mono font-medium">
                      {formatCurrency(item.amount, invoice.currency)}
                    </div>
                  </div>
                ))}

                <Separator className="my-4" />
                <div className="space-y-1">
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono w-28 text-right">
                      {formatCurrency(sub, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-mono w-28 text-right">
                      {formatCurrency(tax, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-8 text-base font-bold pt-1">
                    <span>Total</span>
                    <span className="font-mono w-28 text-right">
                      {formatCurrency(total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <Card>
            <CardContent className="py-4 space-y-4">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Terms</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-12">
          This invoice was shared via Cubiqlo. Powered by{" "}
          <span className="font-medium">Cubiqlo</span>
        </p>
      </div>
    </div>
  );
}
