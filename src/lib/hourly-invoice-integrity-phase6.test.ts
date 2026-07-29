import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 6 hourly invoice source integrity", () => {
  it("keeps time-entry invoice imports eligible, canonical, and unique", () => {
    const actions = read("src/lib/actions/invoices.ts");
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0046_phase0a_integrity_containment.sql");

    expect(actions).toContain("export async function importTimeEntries");
    expect(actions).toContain("eq(timeEntries.status, \"approved\")");
    expect(actions).toContain("eq(timeEntries.billable, true)");
    expect(actions).toContain("isNotNull(timeEntries.endTime)");
    expect(actions).toContain("sql`${timeEntries.durationMinutes} > 0`");
    expect(actions).toContain("assertBillingModelAllowsTimeInvoice(resolveBillingModel(entry))");
    expect(actions).toContain("Time Entry belum memiliki billing rate snapshot");
    expect(actions).toContain("eq(invoiceItems.sourceType, \"time_entry\")");
    expect(actions).toContain("Ada Time Entry yang sudah ditagihkan");
    expect(actions).toContain("previousTimeEntryStatus: \"approved\" as const");
    expect(actions).toContain("status: \"invoiced\"");
    expect(schema).toContain("invoice_items_time_entry_source_uidx");
    expect(migration).toContain("invoice_items_time_entry_source_uidx");
  });

  it("restores linked time entries when draft invoice items are removed or draft invoices are cancelled", () => {
    const actions = read("src/lib/actions/invoices.ts");

    expect(actions).toContain("export async function deleteInvoiceItem");
    expect(actions).toContain("const previousStatus = item.previousTimeEntryStatus ?? \"approved\"");
    expect(actions).toContain("eq(timeEntries.status, \"invoiced\")");
    expect(actions).toContain("export async function cancelDraftInvoice");
    expect(actions).toContain("revertInvoiceTimeEntrySources");
    expect(actions).toContain("eq(invoiceItems.sourceType, \"time_entry\")");
  });

  it("does not allow sent, paid, overdue, cancelled, or archived invoice source detaches", () => {
    const rules = read("src/lib/invoice-finance-rules.ts");
    const actions = read("src/lib/actions/invoices.ts");

    expect(rules).toContain('"sent"');
    expect(rules).toContain('"viewed"');
    expect(rules).toContain('"paid"');
    expect(rules).toContain('"overdue"');
    expect(rules).toContain('"cancelled"');
    expect(rules).toContain('"archived"');
    expect(actions).toContain("assertInvoiceFinancialsMutable(invoice.status)");
  });
});
