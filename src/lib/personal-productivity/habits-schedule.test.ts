import { describe, expect, it } from "vitest";
import { isHabitScheduled } from "./habits";

describe("habit schedule", () => {
  it("rejects check-in on a custom habit off-day", () => {
    expect(isHabitScheduled("specific_weekdays", [1], "2026-09-01")).toBe(false);
  });

  it("accepts check-in on a selected weekday", () => {
    expect(isHabitScheduled("specific_weekdays", [2], "2026-09-01")).toBe(true);
  });
});
