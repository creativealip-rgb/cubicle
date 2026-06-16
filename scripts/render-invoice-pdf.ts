// One-off script: render an existing invoice to PDF and save to /tmp
// Usage: pnpm tsx scripts/render-invoice-pdf.ts <invoiceId>
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  clients,
  workspaces,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { writeFileSync } from "fs";

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    console.error("Usage: tsx scripts/render-invoice-pdf.ts <invoiceId>");
    process.exit(1);
  }

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) {
    console.error("Invoice not found:", invoiceId);
    process.exit(1);
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId)).limit(1);
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, inv.workspaceId)).limit(1);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

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
      logoUrl: ws?.logoUrl ?? null,
    },
    client: {
      name: client?.name ?? "Unknown",
      companyName: client?.companyName ?? null,
      address: client?.address ?? null,
    },
    items: items.map((it: { id: string; description: string; quantity: unknown; unitPrice: unknown; amount: unknown }) => ({
      id: it.id,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: String(it.amount),
    })),
  };

  const buf = await renderInvoicePdf(data);
  const outPath = `/tmp/invoice-${inv.invoiceNumber}.pdf`;
  writeFileSync(outPath, buf);
  console.log(`Wrote ${buf.length} bytes to ${outPath}`);
  console.log(`Header check: ${buf.subarray(0, 4).toString("ascii")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
