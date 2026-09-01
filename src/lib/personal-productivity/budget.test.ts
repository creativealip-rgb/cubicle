import { describe, expect, it } from "vitest";
import { budgetTargets } from "./budget";

describe("50/30/20 budget", () => {
  it("uses exact decimal cents without float drift", () => {
    expect(budgetTargets("1000.01", "50.00", "30.00", "20.00")).toEqual({
      needs: "500.01",
      wants: "300.00",
      savings: "200.00",
    });
  });
  it("rejects allocations that do not total 100", () => {
    expect(() => budgetTargets("100", "50", "30", "19")).toThrow("total 100");
  });
});
