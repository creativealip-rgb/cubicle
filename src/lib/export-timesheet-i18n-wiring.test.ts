import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/invoices/[invoiceId]/export-timesheet-button.tsx", "utf8");

describe("export timesheet button i18n", () => {
  it("does not default trigger copy to Indonesian", () => {
    expect(source).toContain('const triggerLabel = label ?? t("Ekspor Timesheet", "Export Timesheet")');
    expect(source).toContain('{triggerLabel}');
    expect(source).not.toContain('label = "Ekspor Timesheet"');
  });
});
