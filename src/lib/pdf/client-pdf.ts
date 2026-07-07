import { renderToBuffer } from "@react-pdf/renderer";
import { ClientPDF } from "@/components/clients/client-pdf";

type ClientPdfItem = {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: string;
  tags: string[];
  internalNotes: string | null;
  portalEnabled: boolean;
  createdAt: string;
  projects: Array<{ name: string; status: string; dueDate: string | null; clientVisible: boolean }>;
};

export type ClientPdfData = {
  title: string;
  generatedAt: string;
  workspaceName: string;
  clients: ClientPdfItem[];
  lang?: "id" | "en";
};

export async function renderClientPdf(data: ClientPdfData): Promise<Buffer> {
  const buffer = await renderToBuffer(ClientPDF(data));
  return Buffer.from(buffer);
}
