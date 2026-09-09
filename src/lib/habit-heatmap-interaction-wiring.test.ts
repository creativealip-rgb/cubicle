import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const heatmap = readFileSync("src/components/productivity/habit-heatmap.tsx", "utf8");
const habits = readFileSync("src/components/productivity/habits-section.tsx", "utf8");
const visuals = readFileSync("src/lib/personal-productivity/visuals.ts", "utf8");

describe("habit heatmap interaction", () => {
  it("fills available width and submits an exact eligible date", () => {
    expect(heatmap).toContain('className="mx-auto grid max-w-md grid-cols-7 gap-1.5 sm:gap-2"');
    expect(heatmap).toContain("size-6");
    expect(heatmap).toContain("sm:size-7");
    expect(heatmap).toContain('name="date" value={cell.date}');
    expect(heatmap).toContain("cell.totalScheduled === 0");
    expect(habits).toContain('togglePersonalHabitCheckin(String(fd.get("habitId")), String(fd.get("date")))');
    expect(habits).toContain("toggleDateAction={toggleDate}");
    expect(visuals).toContain("!h.startDate || dateStr >= h.startDate");
  });
});