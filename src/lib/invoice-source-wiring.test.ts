import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("invoice source DTO wiring", () => {
  it("loads source DTOs on global, Client, and Project invoice surfaces", () => {
    const loader = read("src/lib/invoice-source-options.ts");
    expect(loader).toContain("loadInvoiceSourceProjectOptions");
    expect(loader).toContain('eq(timeEntries.status, "approved")');
    expect(loader).toContain("notExists");
    expect(loader).toContain('eq(invoiceItems.sourceType, "time_entry")');
    expect(loader).toContain("activeInvoiceStatuses");
    expect(loader).toContain("fixedSourceModes");
    expect(loader).toContain("sum(${invoiceItems.originalAmount})");

    for (const page of [
      "src/app/(app)/app/invoices/new/page.tsx",
      "src/app/(app)/app/clients/[clientId]/page.tsx",
      "src/app/(app)/app/projects/[projectId]/page.tsx",
    ]) expect(read(page)).toContain("loadInvoiceSourceProjectOptions");
  });

  it("renders Fixed advisory and eligible Time Entry picker through shared form", () => {
    const form = read("src/components/forms/invoice-form.tsx");
    expect(form).toContain("hasActiveFixedHistory");
    expect(form).toContain("fixedSourcePreview");
    expect(form).toContain("eligibleTimeEntries");
    expect(form).toContain("Sisa nilai");
    expect(form).toContain('type="checkbox"');
  });
});
