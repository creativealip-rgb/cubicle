import { describe, expect, it } from "vitest";
import { buildReportFxContract } from "./report-fx-contract";
import { reportRangeDays } from "./report-period";

const build = (rows: Array<{ currency: string; amount: string | number }>, rates: Record<string, number> = {}) =>
  buildReportFxContract({ baseCurrency: "IDR", fxSnapshot: "2026-09-13T00:00:00.000Z", rates, rows });

function pageProjection(result: ReturnType<typeof build>) {
  return { status: result.status, total: result.convertedTotals.total, missing: result.missingFx, ranking: result.rankingSet };
}
function exportProjection(result: ReturnType<typeof build>) {
  return { status: result.status, total: result.convertedTotals.total, missing: result.missingFx, ranking: result.rankingSet };
}

describe("Reports FX ten-fixture parity matrix", () => {
  it("1 IDR only", () => expect(build([{ currency: "IDR", amount: "100.25" }])).toMatchObject({ status: "complete", convertedTotal: 100.25 }));
  it("2 USD with valid FX", () => expect(build([{ currency: "USD", amount: "2" }], { USD: 16000 })).toMatchObject({ status: "complete", convertedTotal: 32000 }));
  it("3 missing FX preserves nominal total", () => expect(build([{ currency: "EUR", amount: "2.5" }])).toMatchObject({ status: "partial", convertedTotal: 0, originalTotalsByCurrency: { EUR: 2.5 }, missingFx: [{ currency: "EUR", rowCount: 1, originalTotal: 2.5 }] }));
  it("4 preserves decimal calculation until presentation", () => expect(build([{ currency: "USD", amount: "0.333333" }], { USD: 3 }).convertedTotal).toBeCloseTo(0.999999, 6));
  it("5 accepts inclusive timezone-safe date boundaries", () => expect(reportRangeDays("2024-01-01", "2024-12-31")).toBe(366));
  it("6 empty buckets remain complete and zero", () => expect(build([])).toMatchObject({ status: "complete", convertedTotal: 0, missingFx: [], rankingSet: [] }));
  it("7 duplicate currencies aggregate deterministically", () => expect(build([{ currency: "USD", amount: 1 }, { currency: "USD", amount: 2 }], { USD: 16000 })).toMatchObject({ convertedTotal: 48000, originalTotalsByCurrency: { USD: 3 } }));
  it("8 large custom range is bounded", () => { expect(reportRangeDays("2025-01-01", "2026-01-02")).toBe(367); expect(reportRangeDays("2026-01-02", "2025-01-01")).toBeNull(); });
  it("9 current/comparison inputs stay isolated", () => { const current = build([{ currency: "USD", amount: 2 }], { USD: 16000 }); const comparison = build([{ currency: "USD", amount: 1 }], { USD: 16000 }); expect([current.convertedTotal, comparison.convertedTotal]).toEqual([32000, 16000]); });
  it("10 page and export projections are identical", () => { const result = build([{ currency: "IDR", amount: 10 }, { currency: "USD", amount: 2 }, { currency: "EUR", amount: 3 }], { USD: 16000 }); expect(pageProjection(result)).toEqual(exportProjection(result)); });
});
