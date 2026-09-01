import { describe, expect, it } from "vitest";
import { calculateGoalProgress, normalizeGoalStatus } from "./goals";

describe("goal domain", () => {
  it("uses manual progress when no steps exist", () => {
    expect(calculateGoalProgress([], 37)).toBe(37);
  });

  it("uses completed step ratio when steps exist", () => {
    expect(calculateGoalProgress([true, false, true], 99)).toBe(67);
  });

  it("does not infer achieved status from progress", () => {
    expect(normalizeGoalStatus("in_progress", 100)).toBe("in_progress");
  });
});
