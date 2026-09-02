import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const habits = readFileSync("src/components/productivity/habits-section.tsx", "utf8");
const focus = readFileSync("src/components/productivity/today-focus-card.tsx", "utf8");

describe("daily return loop", () => {
  it("shows unfinished habit reminder and completion recap", () => {
    expect(habits).toContain("Still to do today");
    expect(habits).toContain("scheduledToday && !done");
    expect(focus).toContain("Daily recap");
    expect(focus).toContain("Keep going");
  });
});
