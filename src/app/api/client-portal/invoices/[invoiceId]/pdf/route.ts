import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, clients, workspaces, payments } from "@/db/schema";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { getClientPortalAccess, logPortalAccess } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Token-based invoice PDF for the client portal.
// Auth is the portal token/slug (query ?token=), NOT a logged-in session.
// The invoice must belong to the same client the token resolves to.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  // Resolve portal access (throws on invalid/disabled/revoked/expired)
  let client;
  try {
    client = await getClientPortalAccess(token);
  } catch {
    return NextResponse.json({ error: "Invalid portal link" }, { status: 401 });
  }

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Ownership: invoice must belong to this client + workspace
  if (inv.clientId !== client.id || inv.workspaceId !== client.workspaceId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Don't leak drafts to clients
  if (inv.status === "draft") {
    return NextResponse.json({ error: "Invoice not available" }, { status: 404 });
  }

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, inv.workspaceId))
    .limit(1);
  const [clientRow] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));
  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const amountPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);

  // Audit the download (non-critical)
  try {
    const headersList = await headers();
    await logPortalAccess({
      workspaceId: inv.workspaceId,
      clientId: inv.clientId,
      invoiceId: inv.id,
      tokenType: "invoice_share",
      tokenHashPrefix: token.slice(0, 8),
      ipAddress: headersList.get("x-forwarded-for") || undefined,
      userAgent: headersList.get("user-agent") || undefined,
    });
  } catch {
    // ignore
  }

  const data = {
    invoice: {
      invoiceNumber: inv.invoiceNumber,
      issueDate: String(inv.issueDate),
      dueDate: inv.dueDate ? String(inv.dueDate) : null,
      currency: inv.currency,
      subtotal: String(inv.subtotal),
      tax: String(inv.tax),
      discount: String(inv.discount),
      total: String(inv.total),
      status: inv.status,
      notes: inv.notes,
      terms: inv.terms,
    },
    workspace: {
      billingName: ws?.billingName ?? null,
      billingAddress: ws?.billingAddress ?? null,
      billingEmail: ws?.billingEmail ?? null,
      billingPhone: ws?.billingPhone ?? null,
      taxId: ws?.taxId ?? null,
      logoUrl: ws?.logoUrl ?? null,
      defaultInvoiceTerms: ws?.defaultInvoiceTerms ?? null,
    },
    client: {
      name: clientRow?.name ?? "Unknown",
      companyName: clientRow?.companyName ?? null,
      address: clientRow?.address ?? null,
    },
    items: items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: String(it.amount),
    })),
    amountPaid,
  };

  const buf = await renderInvoicePdf(data);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${inv.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
