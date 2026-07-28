import { describe, expect, it } from "vitest";
import { canEditTimesheetStatus, nextEntryStatusForDecision, reminderState } from "@/lib/timesheet-lifecycle";

describe("timesheet lifecycle", () => {
  it("locks submitted, approved, and invoiced entries", () => {
    expect(canEditTimesheetStatus("draft")).toBe(true);
    expect(canEditTimesheetStatus("rejected")).toBe(true);
    expect(canEditTimesheetStatus("submitted")).toBe(false);
    expect(canEditTimesheetStatus("approved")).toBe(false);
    expect(canEditTimesheetStatus("invoiced")).toBe(false);
  });
  it("maps review decisions", () => {
    expect(nextEntryStatusForDecision("approved")).toBe("approved");
    expect(nextEntryStatusForDecision("rejected")).toBe("rejected");
  });
  it("flags forgotten timers and target shortfall", () => {
    expect(reminderState({ activeMinutes: 9 * 60, weeklyMinutes: 1200, targetMinutes: 2400 })).toEqual({ forgottenTimer: true, targetShortfallMinutes: 1200 });
  });
});
