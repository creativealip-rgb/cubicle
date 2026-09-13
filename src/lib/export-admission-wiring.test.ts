import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routes = [
  "src/app/api/expenses/export/xlsx/route.ts",
  "src/app/api/reports/export/xlsx/route.ts",
  "src/app/api/clients/export/xlsx/route.ts",
  "src/app/api/clients/[clientId]/export/xlsx/route.ts",
  "src/app/api/clients/export/pdf/route.ts",
  "src/app/api/clients/[clientId]/export/pdf/route.ts",
  "src/app/api/invoices/[invoiceId]/pdf/route.ts",
  "src/app/api/proposals/[proposalId]/pdf/route.ts",
  "src/app/api/contracts/[contractId]/pdf/route.ts",
  "src/app/api/time/export/pdf/route.ts",
  "src/app/api/time/export/pdf/va-timesheet/route.ts",
  "src/app/api/invoices/share/[token]/pdf/route.ts",
  "src/app/api/client-portal/invoices/[invoiceId]/pdf/route.ts",
];
describe("heavy export inventory", () => {
  it.each(routes)("guards %s", (path) => expect(readFileSync(path, "utf8")).toContain("withExportAdmission"));
  it("keeps versioned endpoint policy", () => {
    const matrix = JSON.parse(readFileSync("docs/operations/export-endpoint-matrix.json", "utf8"));
    expect(matrix.version).toBe(1);
    expect(matrix.endpoints).toHaveLength(routes.length);
    expect(matrix.policy.redisFailure).toBe("fail-closed");
  });
});
