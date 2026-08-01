import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const table = readFileSync("src/components/invoices/invoices-list-table.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/invoices/page.tsx", "utf8");

describe("invoice table header filters", () => {
  it("passes client/project/type filter metadata into invoice table", () => {
    expect(page).toContain("clientOptions={clientOptions.map");
    expect(page).toContain("projectOptions={projectOptions}");
    expect(page).toContain("currentFilters={{");
  });

  it("uses shared compact table header filters for client, project, and type columns", () => {
    expect(table).toContain("TableHeaderFilter");
    expect(table).not.toContain("InvoiceTableHeaderFilter");
    expect(table).not.toContain("SelectTrigger");
    expect(table).toContain("queryKey=\"clientId\"");
    expect(table).toContain("queryKey=\"projectId\"");
    expect(table).toContain("queryKey=\"billing\"");
  });

  it("keeps filter labels on matching columns", () => {
    expect(table).toMatch(/label=\{t\(\"Klien\", \"Client\"\)\}[\s\S]*queryKey=\"clientId\"/);
    expect(table).toMatch(/label=\{t\(\"Proyek\", \"Project\"\)\}[\s\S]*queryKey=\"projectId\"/);
    expect(table).toMatch(/label=\{t\(\"Jenis\", \"Type\"\)\}[\s\S]*queryKey=\"billing\"/);
  });
});
