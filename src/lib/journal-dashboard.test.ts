import { describe, it, expect } from "vitest";
import { calculateJournalSummary } from "./journal-dashboard";

describe("calculateJournalSummary", () => {
  it("computes thisWeek, streak, and topMood accurately", () => {
    const ref = new Date("2026-09-02T12:00:00Z");
    const entries = [
      { id: "1", createdAt: "2026-09-02T09:00:00Z", mood: "🔥", status: "active" }, // today
      { id: "2", createdAt: "2026-09-01T15:00:00Z", mood: "🔥", status: "active" }, // yesterday
      { id: "3", createdAt: "2026-08-31T10:00:00Z", mood: "😊", status: "active" }, // 2 days ago
      { id: "4", createdAt: "2026-08-20T10:00:00Z", mood: "😴", status: "active" }, // > 7 days ago
      { id: "5", createdAt: "2026-09-02T08:00:00Z", mood: "😢", status: "archived" }, // archived
    ];

    const summary = calculateJournalSummary(entries, 12, ref);

    expect(summary.thisWeek).toBe(3);
    expect(summary.currentStreak).toBe(3);
    expect(summary.topMood).toBe("🔥");
    expect(summary.totalEntries).toBe(12);
  });
});
