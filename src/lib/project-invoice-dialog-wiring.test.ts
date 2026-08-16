import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const tab = read("src/components/projects/project-billing-tab.tsx");
const form = read("src/components/forms/invoice-form.tsx");
const actions = read("src/lib/actions/invoices.ts");

describe("Project-scoped Invoice dialog", () => {
  it("renames Billing tab to Invoice and removes duplicate commercial summary", () => {
    const nav = read("src/components/projects/project-tabs-nav.tsx");
    expect(nav).toContain('value="billing"');
    expect(nav).toContain("Invoice ({invoicesCount})");
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
    expect(read("src/components/invoices/project-invoice-create-dialog.tsx")).toMatch(/setOpen\(false\)[\s\S]*refresh\(\)/);
  });

  it("enforces locked Project and Client in server action", () => {
    expect(actions).toContain("scopedProjectId: z.string().uuid().optional()");
    expect(actions).toContain("Project scope tidak sesuai");
  });
});
