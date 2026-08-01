import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice entry scopes", () => {
  it("wires client-scoped create without a client selector", () => {
    const page = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    const dialog = read("src/components/invoices/client-invoice-create-dialog.tsx");
    expect(page).toContain("ClientInvoiceCreateDialog");
    expect(dialog).toContain("scopedClientId={client.id}");
    expect(dialog).toContain('max-h-[90dvh]');
    expect(dialog).toContain("overflow-y-auto");
  });

  it("keeps global time-entry compatibility and project strict scope", () => {
    const globalPage = read("src/app/(app)/app/invoices/new/page.tsx");
    const projectDialog = read("src/components/invoices/project-invoice-create-dialog.tsx");
    expect(globalPage).toContain("timeEntryIds");
    expect(projectDialog).toContain("scopedProjectId={project.id}");
  });
});
