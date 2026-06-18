import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, clients, workspaces, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Workspace membership check (any role can read; PDF is a view op)
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, inv.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, inv.workspaceId))
    .limit(1);
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

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
    },
    client: {
      name: client?.name ?? "Unknown",
      companyName: client?.companyName ?? null,
      address: client?.address ?? null,
    },
    items: items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: String(it.amount),
    })),
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
