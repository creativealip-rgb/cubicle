import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8");
describe("create detail navigation", () => {
  it("opens newly created client detail", () => {
    const form = read("src/components/forms/client-form.tsx");
    expect(form).toContain("router.push(`/app/clients/${result.client.id}`)");
  });
  it("opens newly created project detail", () => {
    const form = read("src/components/forms/project-form.tsx");
    expect(form).toContain("router.push(`/app/projects/${result.project.id}`)");
  });
  it("passes invoice id through every modal callback", () => {
    for (const file of [
      "invoice-create-dialog.tsx",
      "client-invoice-create-dialog.tsx",
      "project-invoice-create-dialog.tsx",
    ]) {
      const body = read(`src/components/invoices/${file}`);
      expect(body).toContain("invoiceId");
      expect(body).toContain("router.push(`/app/invoices/${invoiceId}`)");
    }
  });
});
