import { db } from "@/db";
import { invoiceItems, invoices } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DraftInvoiceInput = {
  workspaceId: string;
  clientId: string;
  projectId?: string | null;
  billingSource?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  taxRate?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    sourceType?: "manual" | "time_entry" | "project";
  }>;
};

/** Shared primitive for draft invoice row + simple snapshot lines inside caller transaction. */
export async function insertDraftInvoice(tx: Tx, input: DraftInvoiceInput) {
  const items = input.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * (input.taxRate ?? 0) / 100;
  const [invoice] = await tx.insert(invoices).values({
    workspaceId: input.workspaceId,
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    billingSource: input.billingSource ?? null,
    invoiceNumber: input.invoiceNumber,
    issueDate: input.issueDate,
    dueDate: input.dueDate ?? null,
    currency: input.currency,
    subtotal: subtotal.toFixed(2),
    discount: "0",
    tax: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
    status: "draft",
    notes: input.notes ?? null,
    terms: input.terms ?? null,
  }).returning();
  if (items.length) await tx.insert(invoiceItems).values(items.map((item) => ({
    invoiceId: invoice.id,
    description: item.description,
    quantity: item.quantity.toFixed(2),
    unitPrice: item.unitPrice.toFixed(2),
    amount: (item.quantity * item.unitPrice).toFixed(2),
    sourceType: item.sourceType ?? "manual",
  })));
  return invoice;
}
