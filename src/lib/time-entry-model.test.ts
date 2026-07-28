import { describe, expect, it } from "vitest";
import { calculateSegmentMinutes, staleTimerNeedsCorrection } from "@/lib/time-entry-model";

describe("time entry model", () => {
  it("sums completed timer segments without shifting original start", () => {
    expect(calculateSegmentMinutes([
      { startedAt: new Date("2026-07-28T00:00:00Z"), endedAt: new Date("2026-07-28T00:30:00Z") },
      { startedAt: new Date("2026-07-28T01:00:00Z"), endedAt: new Date("2026-07-28T01:45:00Z") },
    ])).toBe(75);
  });

  it("flags timer older than 24 hours instead of silently truncating", () => {
    expect(staleTimerNeedsCorrection(new Date("2026-07-27T00:00:00Z"), new Date("2026-07-28T00:00:01Z"))).toBe(true);
    expect(staleTimerNeedsCorrection(new Date("2026-07-27T12:00:00Z"), new Date("2026-07-28T00:00:00Z"))).toBe(false);
  });
});


describe("Phase 5 schema wiring", () => {
  it("defines duration metadata and timer segments", async () => {
    const fs = await import("node:fs");
    const schema = fs.readFileSync("src/db/schema.ts", "utf8");
    expect(schema).toContain('entryType: text("entry_type"');
    expect(schema).toContain('workDate: date("work_date")');
    expect(schema).toContain('timezoneSnapshot: text("timezone_snapshot")');
    expect(schema).toContain('currencySnapshot: text("currency_snapshot")');
    expect(schema).toContain('export const timerSegments = pgTable("timer_segments"');
  });
});
