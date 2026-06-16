import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/invoice-pdf";

interface InvoiceData {
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string | null;
    currency: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    status: string;
    notes: string | null;
    terms: string | null;
  };
  workspace: {
    billingName: string | null;
    billingAddress: string | null;
    logoUrl: string | null;
  };
  client: {
    name: string;
    companyName: string | null;
    address: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(InvoicePDF(data));
  return Buffer.from(buffer);
}
