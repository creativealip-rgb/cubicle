import { describe, expect, it } from "vitest";
import { timerCombinationKey, toggleFavoriteKey, uniqueRecentTimerCombinations } from "@/lib/timer-combinations";

const row = { clientId: "c", projectId: "p", activityId: "a", taskId: null, description: "Build", tags: "dev" };

describe("timer combinations", () => {
  it("deduplicates recent combinations and keeps order", () => {
    expect(uniqueRecentTimerCombinations([row, row, { ...row, taskId: "t" }])).toHaveLength(2);
  });
  it("builds stable keys and toggles favorites", () => {
    const key = timerCombinationKey(row);
    expect(toggleFavoriteKey([], key)).toEqual([key]);
    expect(toggleFavoriteKey([key], key)).toEqual([]);
  });
});
