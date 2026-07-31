import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("empty timer date contract", () => {
  it("emits the timer start date for today navigation owners", () => {
    const source = readFileSync("src/components/time/timer-widget.tsx", "utf8");
    expect(source).toContain("cubicle:time-entry-started");
    expect(source).toContain("startTime: entry.startTime");
  });
  it("canonical history route owns selectedDate", () => {
    const source = readFileSync("src/components/time/time-route-content.tsx", "utf8");
    expect(source).toContain("selectedDate");
    expect(source).toContain("localDateIso");
  });
});