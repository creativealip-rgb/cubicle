import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const heatmap = readFileSync("src/components/productivity/habit-heatmap.tsx", "utf8");
const habits = readFileSync("src/components/productivity/habits-section.tsx", "utf8");
const visuals = readFileSync("src/lib/personal-productivity/visuals.ts", "utf8");

describe("habit weekly trend", () => {
  it("renders the compact five-week aggregate without retired daily check-in grid", () => {
    expect(heatmap).toContain("grid grid-cols-5");
    expect(heatmap).toContain("weeklyTrends.map");
    expect(heatmap).not.toContain('name="date"');
    expect(habits).not.toContain("toggleDateAction={toggleDate}");
    expect(visuals).toContain("!h.startDate || dateStr >= h.startDate");
  });
});