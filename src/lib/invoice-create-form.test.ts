import { describe, expect, it } from "vitest";
import { addDaysToIsoDate, calculateDraftItemsSubtotal } from "./invoice-create-form";

describe("addDaysToIsoDate", () => {
  it("adds fourteen days across month boundary", () => {
    expect(addDaysToIsoDate("2026-07-24", 14)).toBe("2026-08-07");
  });
});

describe("calculateDraftItemsSubtotal", () => {
  it("sums manual and selected time items", () => {
    expect(calculateDraftItemsSubtotal([
      { quantity: 2, unitPrice: 100 },
      { quantity: 1.5, unitPrice: 200 },
    ])).toBe(500);
  });
});
