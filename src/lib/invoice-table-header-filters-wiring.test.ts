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

  it("renders header filters for client, project, and type columns", () => {
    expect(table).toContain("InvoiceTableHeaderFilter");
    expect(table).toContain("filterKey=\"clientId\"");
    expect(table).toContain("filterKey=\"projectId\"");
    expect(table).toContain("filterKey=\"billing\"");
  });

  it("keeps sortable headers on filtered columns", () => {
    expect(table).toMatch(/label=\{t\(\"Klien\", \"Client\"\)\}[\s\S]*filterKey=\"clientId\"/);
    expect(table).toMatch(/label=\{t\(\"Proyek\", \"Project\"\)\}[\s\S]*filterKey=\"projectId\"/);
    expect(table).toMatch(/label=\{t\(\"Jenis\", \"Type\"\)\}[\s\S]*filterKey=\"billing\"/);
  });
});
