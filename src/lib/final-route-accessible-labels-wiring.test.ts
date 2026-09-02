import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("final route sweep accessible labels", () => {
  it("labels client and personal search controls", () => {
    expect(read("src/app/(app)/app/clients/page.tsx")).toContain('aria-label={t("Cari klien", "Search clients")}');
    expect(read("src/app/(app)/app/personal/page.tsx")).toContain('placeholder={t(');
  });

  it("associates questionnaire name and description labels", () => {
    const source = read("src/components/questionnaires/questionnaire-builder.tsx");
    expect(source).toContain('htmlFor="questionnaire-name"');
    expect(source).toContain('id="questionnaire-name"');
    expect(source).toContain('htmlFor="questionnaire-description"');
    expect(source).toContain('id="questionnaire-description"');
  });

  it("associates journal form labels and labels journal search", () => {
    const page = read("src/components/journal/journal-composer-dialog.tsx");
    for (const id of ["journal-title", "journal-tags", "journal-body"]) {
      expect(page).toContain(`htmlFor="${id}"`);
      expect(page).toContain(`id="${id}"`);
    }
    expect(read("src/components/journal/journal-list.tsx")).toContain('aria-label={isId ? "Cari entri jurnal" : "Search journal entries"}');
  });

  it("associates every invoice metadata label with its control", () => {
    const source = read("src/components/invoices/invoice-meta-form.tsx");
    for (const id of ["invoice-currency", "invoice-issue-date", "invoice-due-date", "invoice-tax", "invoice-discount", "invoice-notes", "invoice-terms"]) {
      expect(source).toContain(`htmlFor="${id}"`);
      expect(source).toContain(`id="${id}"`);
    }
  });
});
