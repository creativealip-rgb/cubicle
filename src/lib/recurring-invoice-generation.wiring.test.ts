import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("recurring invoice generation wiring", () => {
  it("locks rules and records occurrence atomically", () => {
    const source = read("src/lib/actions/recurring-invoices.ts");
    expect(source).toContain('.for("update")');
    expect(source).toContain("recurringInvoiceGenerations");
    expect(source).toContain("occurrenceDate: rule.nextRunDate");
    expect(source).toContain("lastSequence: sequence");
    expect(source).toContain("nextRecurringInvoiceDate");
  });

  it("validates tenant relations and manual generation workspace", () => {
    const source = read("src/lib/actions/recurring-invoices.ts");
    expect(source).toContain("eq(clients.workspaceId, workspaceId)");
    expect(source).toContain("rule.workspaceId !== workspaceId");
    expect(source).toContain("eq(projects.clientId, rule.clientId)");
  });

  it("protects cron with shared auth", () => {
    const route = read("src/app/api/cron/recurring-invoices/route.ts");
    expect(route).toContain("verifyCronRequest(request)");
    expect(route).toContain("generateDueRecurringInvoices()");
  });
});
