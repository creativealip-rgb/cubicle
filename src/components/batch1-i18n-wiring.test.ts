import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("batch 1 i18n wiring", () => {
  it("template center wires useT() and localizes tab, dialog, and card copy", () => {
    const comp = source("src/components/template-center-client.tsx");
    expect(comp).toContain('import { useT } from "@/lib/i18n-client";');
    expect(comp).toContain("const { t } = useT();");
    // Two tabs localized (invoice tab removed)
    expect(comp).toContain('t("Proposal", "Proposals")');
    expect(comp).toContain('t("Kontrak", "Contracts")');
    expect(comp).not.toContain('t("Invoice", "Invoices")');
    // Proposal empty state + card copy localized
    expect(comp).toContain('t("Belum ada template proposal", "No proposal templates yet")');
    // Contract empty state localized (full editor links removed)
    expect(comp).toContain('t("Belum ada template kontrak", "No contract templates yet")');
    expect(comp).not.toContain('t("Editor penuh", "Full editor")');
    // Dialog fields localized
    expect(comp).toContain('t("Nama template *", "Template name *")');
    expect(comp).toContain('t("Mata uang", "Currency")');
    expect(comp).toContain('t("PPN (%)\", \"Tax (%)\")');
    expect(comp).toContain('t("Jadikan template default", "Make default template")');
    expect(comp).toContain('t("Batal", "Cancel")');
    expect(comp).toContain('t("Simpan", "Save")');
    expect(comp).toContain('t("Buat", "Create")');
    // TemplateCard (separate component) wires its own useT()
    expect(comp).toContain("function TemplateCard({");
    expect(comp).toContain('t("Tanpa preview", "No preview")');
    expect(comp).toContain('t("Duplikat", "Duplicate")');
    expect(comp).toContain('t("Hapus", "Delete")');
  });

  it("proposal list page localizes empty state and new-proposal CTA", () => {
    const page = source("src/app/(app)/app/proposals/page.tsx");
    expect(page).toContain('import { getCurrentLang, createT } from "@/lib/i18n";');
    expect(page).toContain("const t = createT(lang);");
    expect(page).toContain('t("Belum ada proposal", "No proposals yet")');
    expect(page).toContain("CreateProposalButton");
  });

  it("questionnaires page keeps shared chrome and localized copy", () => {
    const page = source("src/app/(app)/app/questionnaires/page.tsx");
    expect(page).toContain('className="app-page-header"');
    expect(page).not.toMatch(/<div className="space-y-6 p-4 sm:p-6">/);
  });

  it("expenses table localizes actions and uses useT()", () => {
    const comp = source("src/components/expenses/expenses-list-table.tsx");
    expect(comp).toContain('import { useT } from "@/lib/i18n-client";');
    expect(comp).toContain("const { t } = useT();");
  });

  it("task page tabs localize tab labels", () => {
    const comp = source("src/components/tasks/task-page-tabs.tsx");
    expect(comp).toContain('t("Tugas Proyek", "Project Tasks")');
    expect(comp).toContain('t("Template Tugas", "Task Templates")');
  });

  it("export timesheet button localizes dialog title", () => {
    const comp = source("src/app/(app)/app/invoices/[invoiceId]/export-timesheet-button.tsx");
    expect(comp).toContain('t("Ekspor Timesheet", "Export Timesheet")');
  });

  it("support client localizes status/priority labels instead of bare strings", () => {
    const comp = source("src/app/(app)/app/support/support-client.tsx");
    expect(comp).toContain('import { useT } from "@/lib/i18n-client";');
    expect(comp).toContain('t("Terbuka", "Open")');
    // No bare Indonesian label mapping remains (only inside t() calls)
    expect(comp).not.toMatch(/:\s*"Terbuka"/);
    expect(comp).not.toMatch(/:\s*"Dikerjakan"/);
    expect(comp).not.toMatch(/:\s*"Mendesak"/);
  });

  it("contract template builder localizes name placeholder and variable descriptions", () => {
    const comp = source("src/components/contracts/contract-template-builder.tsx");
    expect(comp).toContain('t("mis. Perjanjian jasa standar", "e.g. Standard service agreement")');
    expect(comp).toContain('"client.name": t("Nama klien", "Client name")');
  });
});
