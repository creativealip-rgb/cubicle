import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalPDF } from "@/components/proposals/proposal-pdf";

interface ProposalPdfData {
  proposal: {
    title: string;
    status: string;
    body: string | null;
    contentBlocks?: unknown;
    lineItems?: unknown;
    subtotal?: string;
    tax?: string;
    total?: string;
    currency: string;
    downPaymentPercent?: string;
    validUntil: string | null;
    sentAt: string | null;
  };
  workspace: { name: string; billingName: string | null; billingAddress: string | null };
  client: { name: string; email: string | null; companyName: string | null };
}

export async function renderProposalPdf(data: ProposalPdfData): Promise<Buffer> {
  const buffer = await renderToBuffer(ProposalPDF(data));
  return Buffer.from(buffer);
}
