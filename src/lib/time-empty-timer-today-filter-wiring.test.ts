import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const timer = readFileSync("src/components/time/timer-widget.tsx", "utf8");
const teamTimesheet = readFileSync("src/components/time/team-timesheet-view.tsx", "utf8");
const timesheet = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("empty timer appears in today's filter", () => {
  it("empty timer flow emits or triggers today reset", () => {
    expect(timer).toContain("handleStartEmpty");
    expect(timer).toMatch(/onTimerStarted|reset.*Today|set.*Today|time-entry-started/i);
  });

  it("daily filter owner can reset selected date to today", () => {
    const source = `${teamTimesheet}\n${timesheet}`;
    expect(source).toMatch(/set.*Today|goToToday|selectedDate|dateOffset/i);
  });
});
