import { describe, expect, it } from "vitest";
import { calculateHealthyStreak, healthyHabitStats, weeklyReview } from "./retention";

describe("productivity retention helpers", () => {
  it("keeps one missed scheduled day in recovery", () => {
    expect(calculateHealthyStreak("daily", [], "2026-09-02", ["2026-09-01"])).toMatchObject({ streak: 1, inRecovery: true });
  });

  it("does not mark a never-started habit as recovery", () => {
    expect(calculateHealthyStreak("daily", [], "2026-09-04", [])).toMatchObject({ streak: 0, inRecovery: false });
  });

  it("creates weekly review copy", () => {
    expect(weeklyReview(4, 5, 2, 1)).toMatchObject({ rate: 80, headline: "Strong week" });
  });

  it("separates current, historical best, and completed days", () => {
    expect(healthyHabitStats("daily", [], "2026-09-04", ["2026-09-01", "2026-09-02", "2026-09-04"])).toMatchObject({ currentStreak: 3, bestStreak: 3, completedDays: 3 });
  });

  it("keeps historical best beyond 90 days", () => {
    expect(healthyHabitStats("daily", [], "2026-09-04", ["2026-01-01", "2026-01-02", "2026-01-03"]).bestStreak).toBe(3);
  });
});
