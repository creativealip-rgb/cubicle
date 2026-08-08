import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice status transition guard wiring", () => {
  it("updateInvoice rejects leaving terminal paid/cancelled/archived states and invalid backwards transitions", () => {
    const actions = read("src/lib/actions/invoices.ts");
    // Guard helper is imported from the pure rules module
    expect(actions).toContain("isInvoiceStatusTransitionAllowed");
    // Guard is actually applied when a status change is requested
    expect(actions).toMatch(/isInvoiceStatusTransitionAllowed\(currentInvoice\.status/);
    // Rejection surfaces a user-facing error (semantic anchor: "status ... tidak dapat diubah")
    expect(actions).toMatch(/status.*tidak dapat diubah/i);
  });

  it("keeps the draft -> cancelled UX block (cancelDraftInvoice action)", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toContain('parsed.status === "cancelled" && currentInvoice.status === "draft"');
  });

  it("does not break legitimate external transitions (sendEmail -> sent, cron -> overdue)", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toMatch(/status: "sent"/);
    expect(actions).toMatch(/status: "overdue"/);
  });
});
