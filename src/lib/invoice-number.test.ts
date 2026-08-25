import { describe, expect, it } from "vitest";
import {
  invoiceNumberTakenMessage,
  isInvoiceNumberUniqueConstraint,
  normalizeInvoiceNumber,
} from "./invoice-number";

describe("invoice number helpers", () => {
  it("trims and uppercases valid numbers", () => {
    expect(normalizeInvoiceNumber("  inv-2026-ab  ")).toBe("INV-2026-AB");
  });

  it("normalizes empty values to undefined", () => {
    expect(normalizeInvoiceNumber("   ")).toBeUndefined();
    expect(normalizeInvoiceNumber(null)).toBeUndefined();
    expect(normalizeInvoiceNumber(undefined)).toBeUndefined();
  });

  it.each(["INV- café", "INV-\n001", "INV-\t001", "A".repeat(101)])(
    "rejects malformed invoice number %j",
    (value) => expect(() => normalizeInvoiceNumber(value)).toThrow(),
  );

  it("accepts printable custom invoice numbers up to 100 characters", () => {
    expect(normalizeInvoiceNumber(" acme august 01 ")).toBe("ACME AUGUST 01");
    expect(normalizeInvoiceNumber("A".repeat(100))).toHaveLength(100);
  });

  it("matches direct invoice-number constraint", () => {
    expect(isInvoiceNumberUniqueConstraint({ constraint: "invoices_workspace_id_invoice_number_unique" })).toBe(true);
  });

  it("matches nested invoice-number constraint", () => {
    expect(isInvoiceNumberUniqueConstraint({ cause: { code: "23505", constraint: "invoices_workspace_id_invoice_number_unique" } })).toBe(true);
  });

  it("rejects unrelated 23505 errors", () => {
    expect(isInvoiceNumberUniqueConstraint({ code: "23505", constraint: "invoices_shared_token_hash_unique" })).toBe(false);
    expect(isInvoiceNumberUniqueConstraint({ cause: { code: "23505", constraint: "clients_name_unique" } })).toBe(false);
  });

  it("requires matching constraint even without PostgreSQL code", () => {
    expect(isInvoiceNumberUniqueConstraint({ constraint: "invoices_workspace_id_invoice_number_unique" })).toBe(true);
    expect(isInvoiceNumberUniqueConstraint({ code: "23505" })).toBe(false);
  });

  it("builds duplicate message", () => {
    expect(invoiceNumberTakenMessage("INV-2026-001")).toContain("INV-2026-001");
  });
});

