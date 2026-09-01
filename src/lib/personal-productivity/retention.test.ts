import { describe, expect, it } from "vitest";
import { calculateHealthyStreak, habitReviewLabel, weeklyReview } from "./retention";

describe("productivity retention helpers", () => {
  it("keeps one missed scheduled day in recovery", () => {
    expect(calculateHealthyStreak("daily", [], "2026-09-02", ["2026-09-01"])).toMatchObject({ streak: 1, inRecovery: true });
  });

  it("creates weekly review copy", () => {
    expect(weeklyReview(4, 5, 2, 1)).toMatchObject({ rate: 80, headline: "Strong week" });
  });

  it("labels habit health without gamification", () => {
    expect(habitReviewLabel(25)).toBe("Start small");
  });
});
