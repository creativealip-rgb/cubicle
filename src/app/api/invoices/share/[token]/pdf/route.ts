import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  clients,
  workspaces,
  payments,
} from "@/db/schema";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { logPortalAccess } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public invoice PDF via share token (no login).
 * Used in client emails so link opens same PDF as "Unduh PDF".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.sharedTokenHash, tokenHash))
    .limit(1);

  if (!inv) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }
  if (inv.sharedTokenRevokedAt) {
    return NextResponse.json({ error: "Link revoked" }, { status: 410 });
  }
  if (inv.sharedTokenExpiresAt && new Date(inv.sharedTokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }
  // Don't block draft when share token is secret — email path marks sent first.
  // Cancelled invoices still blocked.
  if (inv.status === "cancelled") {
    return NextResponse.json({ error: "Invoice not available" }, { status: 404 });
  }

  // Mark viewed (best-effort)
  if (inv.status === "sent" || !inv.clientFirstViewedAt) {
    try {
      await db
        .update(invoices)
        .set({
          status: inv.status === "sent" ? "viewed" : inv.status,
          clientFirstViewedAt: inv.clientFirstViewedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, inv.id));
    } catch {
      // non-critical
    }
  }

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
    .where(eq(invoiceItems.invoiceId, inv.id));
  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, inv.id));
  const amountPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);

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
