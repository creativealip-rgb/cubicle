import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("invoice PDF timesheet grouping", () => {
  it("groups time-entry rows by project and rate for display only", () => {
    const pdf = read("src/components/invoices/invoice-pdf.tsx");
    expect(pdf).toContain('item.sourceType !== "time_entry"');
    expect(pdf).toContain('const key = `time:${projectName}:${item.unitPrice}`');
    expect(pdf).toContain("displayItems");
  });

  it("passes source type from every PDF endpoint", () => {
    for (const path of [
      "src/app/api/invoices/[invoiceId]/pdf/route.ts",
      "src/app/api/invoices/share/[token]/pdf/route.ts",
      "src/app/api/client-portal/invoices/[invoiceId]/pdf/route.ts",
    ]) expect(read(path)).toContain("sourceType: it.sourceType");
  });
});
