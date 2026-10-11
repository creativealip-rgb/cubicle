import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice entry scopes", () => {
  it("wires client-scoped create without a client selector", () => {
    const page = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    // Client detail creates invoices through the one-click direct button; the
    // client id is passed in so no client selector is rendered.
    expect(page).toContain("<DirectCreateInvoiceButton clientId={client.id} />");
  });

  it("keeps global time-entry compatibility and project strict scope", () => {
    const globalPage = read("src/app/(app)/app/invoices/new/page.tsx");
    const projectDialog = read("src/components/invoices/project-invoice-create-dialog.tsx");
    expect(globalPage).toContain("timeEntryIds");
    expect(projectDialog).toContain("scopedProjectId={project.id}");
  });
});
