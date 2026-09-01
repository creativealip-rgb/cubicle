import { describe, expect, it } from "vitest";
import { assertIsoCurrency, summarizeBudget } from "./money";

describe("personal money policy", () => {
  it("rejects formatted but unsupported currency codes", () => {
    expect(() => assertIsoCurrency("ZZZ")).toThrow("Unsupported currency");
    expect(assertIsoCurrency("IDR")).toBe("IDR");
  });
  it("keeps savings allocation separate from spending", () => {
    expect(
      summarizeBudget([
        { type: "expense", bucket: "needs", amount: "40.00" },
        { type: "allocation", bucket: "savings", amount: "20.00" },
      ]),
    ).toEqual({
      needs: "40.00",
      wants: "0.00",
      savings: "20.00",
      unbudgeted: "0.00",
      spending: "40.00",
    });
  });
});
