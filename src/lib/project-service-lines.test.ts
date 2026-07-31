import { describe, expect, it } from "vitest";
import { buildProjectServiceDocumentLines } from "./project-service-lines";

describe("buildProjectServiceDocumentLines", () => {
  it("preserves project service snapshots as immutable document lines", () => {
    expect(buildProjectServiceDocumentLines([
      { id: "ps-1", nameSnapshot: "SEO Audit", descriptionSnapshot: "Technical audit", quantity: "2", unitPrice: "750000", amount: null, currencySnapshot: "IDR", status: "active" },
    ], "IDR")).toEqual([
      { description: "SEO Audit — Technical audit", quantity: 2, unitPrice: 750000, amount: 1500000, sourceType: "project_service", sourceId: "ps-1", originalCurrency: "IDR", originalAmount: 1500000 },
    ]);
  });

  it("rejects mixed currencies instead of silently relabeling money", () => {
    expect(() => buildProjectServiceDocumentLines([
      { id: "ps-1", nameSnapshot: "Design", descriptionSnapshot: null, quantity: "1", unitPrice: "100", amount: "100", currencySnapshot: "USD", status: "active" },
    ], "IDR")).toThrow("Kurs Project Service USD ke IDR belum tersedia");
  });

  it("ignores archived snapshots", () => {
    expect(buildProjectServiceDocumentLines([
      { id: "ps-1", nameSnapshot: "Old", descriptionSnapshot: null, quantity: "1", unitPrice: "1", amount: "1", currencySnapshot: "IDR", status: "archived" },
    ], "IDR")).toEqual([]);
  });
});
