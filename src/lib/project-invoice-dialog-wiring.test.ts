import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const page = read("src/app/(app)/app/projects/[projectId]/page.tsx");
const tab = read("src/components/projects/project-billing-tab.tsx");
const form = read("src/components/forms/invoice-form.tsx");
const actions = read("src/lib/actions/invoices.ts");

describe("Project-scoped Invoice dialog", () => {
  it("renames Billing tab to Invoice and removes duplicate commercial summary", () => {
    expect(page).toContain('value="billing"');
    expect(page).toContain("Invoice ({projectInvoices.length})");
    expect(tab).not.toContain("ProjectBillingSummary");
    expect(tab).not.toContain("Model billing");
    expect(tab).not.toContain("Nilai proyek");
  });

  it("opens shared Invoice form in a controlled Project dialog", () => {
    const dialog = read("src/components/invoices/project-invoice-create-dialog.tsx");
    expect(tab).toContain("ProjectInvoiceCreateDialog");
    expect(dialog).toContain("Buat Invoice");
    expect(dialog).toContain("<InvoiceForm");
  });

  it("locks Client and Project selectors and refreshes without navigation", () => {
    expect(form).toContain("scopedProjectId?: string");
    expect(form).toContain("scopedClientId?: string");
    expect(form).toMatch(/!scopedClientId\s*&&[\s\S]*<Label htmlFor="clientId">/);
    expect(form).toMatch(/!scopedProjectId\s*&&[\s\S]*Proyek \(bisa pilih beberapa\)/);
    expect(form).toContain("onSuccess?.()");
    expect(form).toContain("if (onSuccess)");
    expect(read("src/components/invoices/project-invoice-create-dialog.tsx")).toMatch(/setOpen\(false\)[\s\S]*router\.refresh\(\)/);
  });

  it("enforces locked Project and Client in server action", () => {
    expect(actions).toContain("scopedProjectId: z.string().uuid().optional()");
    expect(actions).toContain("Project scope tidak sesuai");
    expect(actions).toContain("eq(timeEntries.projectId, parsed.scopedProjectId)");
  });
});
