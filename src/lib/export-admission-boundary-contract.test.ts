import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routes = [
  ["src/app/api/expenses/export/xlsx/route.ts", "writeBuffer()"],
  ["src/app/api/reports/export/xlsx/route.ts", "xlsxResponse("],
  ["src/app/api/clients/export/xlsx/route.ts", "writeBuffer()"],
  ["src/app/api/clients/[clientId]/export/xlsx/route.ts", "writeBuffer()"],
  ["src/app/api/clients/export/pdf/route.ts", "renderClientPdf("],
  ["src/app/api/clients/[clientId]/export/pdf/route.ts", "renderClientPdf("],
  ["src/app/api/invoices/[invoiceId]/pdf/route.ts", "renderInvoicePdf("],
  ["src/app/api/proposals/[proposalId]/pdf/route.ts", "renderProposalPdf("],
  ["src/app/api/contracts/[contractId]/pdf/route.ts", "renderContractPdf("],
  ["src/app/api/time/export/pdf/route.ts", "new NextResponse(html"],
  ["src/app/api/time/export/pdf/va-timesheet/route.ts", "new NextResponse(html"],
  ["src/app/api/invoices/share/[token]/pdf/route.ts", "renderInvoicePdf("],
  ["src/app/api/client-portal/invoices/[invoiceId]/pdf/route.ts", "renderInvoicePdf("],
] as const;

describe("export admission boundary", () => {
  it.each(routes)("authorizes before admission and admits before materialization: %s", (path, materializeMarker) => {
    const source = readFileSync(path, "utf8");
    const admission = source.indexOf("withExportAdmission(");
    expect(admission).toBeGreaterThan(-1);
    expect(source.indexOf(materializeMarker, admission)).toBeGreaterThan(admission);
    expect(source.slice(0, admission)).toMatch(/session\?\.user|getClientPortalAccess|tokenHash|workspaceId/);
  });
});
