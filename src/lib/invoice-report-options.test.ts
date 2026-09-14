import { describe, expect, it } from "vitest";
import { buildInvoiceReportUrl, normalizeInvoiceReportRange, signInvoiceReportRange, verifyInvoiceReportRangeSignature } from "./invoice-report-options";

describe("normalizeInvoiceReportRange", () => {
  it("accepts an ordered date range", () => {
    expect(normalizeInvoiceReportRange("2026-07-01", "2026-07-31")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("rejects reversed date ranges", () => {
    expect(() => normalizeInvoiceReportRange("2026-07-31", "2026-07-01")).toThrow(
      "Tanggal awal harus sebelum tanggal akhir",
    );
  });

  it("rejects invalid dates", () => {
    expect(() => normalizeInvoiceReportRange("01-07-2026", "2026-07-31")).toThrow(
      "Rentang tanggal tidak valid",
    );
  });

  it("rejects impossible dates and ranges longer than 366 days", () => {
    expect(() => normalizeInvoiceReportRange("2026-02-31", "2026-03-01")).toThrow("Rentang tanggal tidak valid");
    expect(() => normalizeInvoiceReportRange("2025-01-01", "2026-01-02")).toThrow("Rentang tanggal maksimal 366 hari");
    expect(normalizeInvoiceReportRange("2024-01-01", "2024-12-31")).toEqual({ from: "2024-01-01", to: "2024-12-31" });
  });
});

describe("invoice report range signature", () => {
  it("rejects a changed date range", () => {
    const range = { from: "2026-07-01", to: "2026-07-31" };
    const signature = signInvoiceReportRange("token", range, "secret");
    expect(verifyInvoiceReportRangeSignature("token", range, signature, "secret")).toBe(true);
    expect(verifyInvoiceReportRangeSignature("token", { from: "2026-01-01", to: "2026-07-31" }, signature, "secret")).toBe(false);
  });
});

describe("buildInvoiceReportUrl", () => {
  it("builds a tokenized report URL with invoice-bound dates", () => {
    expect(
      buildInvoiceReportUrl("https://app.cubiqlo.com/", "secret token", {
        from: "2026-07-01",
        to: "2026-07-31",
      }),
    ).toBe(
      "https://app.cubiqlo.com/api/time/export/pdf/va-timesheet?report=full&invoiceToken=secret+token&from=2026-07-01&to=2026-07-31",
    );
  });
});
