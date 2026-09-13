import { describe, expect, it } from "vitest";
import { buildReportFxContract } from "./report-fx-contract";

describe("report FX contract", () => {
  it("marks partial and preserves missing row counts plus original totals", () => {
    const result = buildReportFxContract({
      baseCurrency: "IDR",
      fxSnapshot: "2026-09-13T00:00:00.000Z",
      rates: { USD: 16000 },
      rows: [
        { currency: "IDR", amount: "100000" },
        { currency: "USD", amount: "10" },
        { currency: "EUR", amount: "2.50" },
        { currency: "EUR", amount: "3.25" },
      ],
    });
    expect(result.status).toBe("partial");
    expect(result.convertedTotal).toBe(260000);
    expect(result.originalTotalsByCurrency).toEqual({ EUR: 5.75, IDR: 100000, USD: 10 });
    expect(result.missingFx).toEqual([{ currency: "EUR", rowCount: 2, originalTotal: 5.75 }]);
  });

  it("marks complete when all rates exist", () => {
    expect(buildReportFxContract({ baseCurrency: "IDR", fxSnapshot: "x", rates: { USD: 16000 }, rows: [{ currency: "USD", amount: 1 }] }).status).toBe("complete");
  });
});
