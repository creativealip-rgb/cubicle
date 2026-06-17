import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPDF } from "@/components/contracts/contract-pdf";

interface ContractData {
  contract: {
    title: string;
    status: string;
    body: string;
    validUntil: string | null;
    sentAt: string | null;
    signedAt: string | null;
    signedName: string | null;
    signedEmail: string | null;
    signatureDataUrl: string | null;
    signedFromIp: string | null;
    declineReason: string | null;
  };
  workspace: { name: string; billingName: string | null; billingAddress: string | null };
  client: { name: string; email: string | null; companyName: string | null };
}

export async function renderContractPdf(data: ContractData): Promise<Buffer> {
  const buffer = await renderToBuffer(ContractPDF(data));
  return Buffer.from(buffer);
}
