import { describe, expect, it } from "vitest";
import { buildMeetingSchedule, canTransitionMeeting, intervalsOverlap, meetingScheduleSchema } from "./meeting-schedule";

describe("meeting schedule", () => {
  it("converts Jakarta local time to UTC and calculates end", () => {
    const result = buildMeetingSchedule({ date: "2027-01-02", time: "09:30", durationMinutes: 60, timezone: "Asia/Jakarta" }, new Date("2026-01-01T00:00:00Z"));
    expect(result.start.toISOString()).toBe("2027-01-02T02:30:00.000Z");
    expect(result.end.toISOString()).toBe("2027-01-02T03:30:00.000Z");
  });
  it("rejects invalid duration, timezone, and past schedule", () => {
    expect(() => meetingScheduleSchema.parse({ date: "2027-01-02", time: "09:30", durationMinutes: 15, timezone: "Asia/Jakarta" })).toThrow();
    expect(() => buildMeetingSchedule({ date: "2027-01-02", time: "09:30", durationMinutes: 60, timezone: "Mars/Olympus" })).toThrow("Zona waktu tidak valid");
    expect(() => buildMeetingSchedule({ date: "2020-01-02", time: "09:30", durationMinutes: 60, timezone: "Asia/Jakarta" }, new Date("2026-01-01T00:00:00Z"))).toThrow("Jadwal harus di masa depan");
  });
  it("uses half-open interval overlap semantics", () => {
    const a = new Date("2027-01-01T01:00:00Z"), b = new Date("2027-01-01T02:00:00Z"), c = new Date("2027-01-01T03:00:00Z");
    expect(intervalsOverlap(a, b, b, c)).toBe(false);
    expect(intervalsOverlap(a, c, b, c)).toBe(true);
  });
  it("allows only meeting workflow transitions", () => {
    expect(canTransitionMeeting("requested", "approved")).toBe(true);
    expect(canTransitionMeeting("requested", "counter_proposed")).toBe(true);
    expect(canTransitionMeeting("counter_proposed", "requested")).toBe(true);
    expect(canTransitionMeeting("approved", "requested")).toBe(false);
  });
});
