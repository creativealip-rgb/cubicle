import { describe, expect, it } from "vitest";
import { buildDefaultInvoiceMessage, validateInvoiceMessage } from "./invoice-message";

describe("buildDefaultInvoiceMessage", () => {
  it("builds an editable Indonesian message with invoice link placeholder", () => {
    const message = buildDefaultInvoiceMessage({
      clientName: "PT Contoh",
      invoiceNumber: "INV-001",
      amount: "Rp 1.000.000",
      dueDate: "31 Juli 2026",
    });

    expect(message).toContain("PT Contoh");
    expect(message).toContain("INV-001");
    expect(message).toContain("Rp 1.000.000");
    expect(message).toContain("31 Juli 2026");
    expect(message).toContain("{{invoice_link}}");
  });
});

describe("validateInvoiceMessage", () => {
  it("rejects an empty message", () => {
    expect(() => validateInvoiceMessage("   ")).toThrow("Body pesan wajib diisi");
  });

  it("rejects a message longer than 10000 characters", () => {
    expect(() => validateInvoiceMessage("a".repeat(10001))).toThrow(
      "Body pesan maksimal 10.000 karakter",
    );
  });

  it("trims a valid message", () => {
    expect(validateInvoiceMessage("  Halo klien  ")).toBe("Halo klien");
  });
});
