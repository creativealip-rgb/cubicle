import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("invoice origin wiring", () => {
  it("keeps invoice access workspace-scoped before resolving origin", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");
    const invoiceAccess = page.indexOf("eq(invoices.workspaceId, workspaceId)");
    const originResolution = page.indexOf("const requestedOrigin = parseInvoiceOrigin");

    expect(invoiceAccess).toBeGreaterThan(-1);
    expect(originResolution).toBeGreaterThan(invoiceAccess);
  });

  it("validates contextual resources in current workspace before Back link", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");

    expect(page).toContain("eq(projects.workspaceId, workspaceId)");
    expect(page).toContain("eq(clients.workspaceId, workspaceId)");
    expect(page).toContain("buildInvoiceBackUrl(validatedOrigin)");
    expect(page).toContain("<Link href={backUrl}>");
  });

  it("adds explicit project, client, and global origins to invoice links", () => {
    const project = read("src/components/projects/project-billing-tab.tsx");
    const client = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    const globalList = read("src/components/invoices/invoices-list-table.tsx");

    expect(project).toContain('type: "project", resourceId: projectId');
    expect(client).toContain('type: "client", resourceId: clientId');
    expect(globalList).toContain('type: "global"');
  });
});
