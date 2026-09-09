import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const heatmap = readFileSync("src/components/productivity/habit-heatmap.tsx", "utf8");
const habits = readFileSync("src/components/productivity/habits-section.tsx", "utf8");

describe("habit heatmap interaction", () => {
  it("fills available width and submits an exact eligible date", () => {
    expect(heatmap).toContain('className="grid grid-cols-7 gap-2 sm:gap-3"');
    expect(heatmap).toContain('name="date" value={cell.date}');
    expect(heatmap).toContain("cell.totalScheduled === 0");
    expect(habits).toContain('togglePersonalHabitCheckin(String(fd.get("habitId")), String(fd.get("date")))');
    expect(habits).toContain("toggleDateAction={toggleDate}");
  });
});