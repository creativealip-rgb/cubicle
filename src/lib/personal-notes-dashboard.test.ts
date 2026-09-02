import { describe, it, expect } from "vitest";
import { calculateNotesSummary } from "./personal-notes-dashboard";

describe("calculateNotesSummary", () => {
  it("computes dueSoon and pinned accurately based on referenceDate", () => {
    const ref = new Date("2026-09-02T10:00:00Z");
    const notes = [
      { id: "1", dueDate: "2026-09-04T12:00:00Z", status: "open", pinned: true }, // due in 2d, pinned
      { id: "2", dueDate: "2026-09-15T12:00:00Z", status: "open", pinned: false }, // due in 13d
      { id: "3", dueDate: "2026-09-03T12:00:00Z", status: "done", pinned: true }, // done, pinned
      { id: "4", dueDate: "2026-08-30T12:00:00Z", status: "open", pinned: false }, // overdue (not due soon)
      { id: "5", dueDate: null, status: "open", pinned: true }, // no due date, pinned
    ];
    const counts = { open: 4, done: 1, archived: 0, all: 5 };

    const summary = calculateNotesSummary(notes, counts, ref);

    expect(summary.open).toBe(4);
    expect(summary.done).toBe(1);
    expect(summary.pinned).toBe(3);
    expect(summary.dueSoon).toBe(1);
  });
});
