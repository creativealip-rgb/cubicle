import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const widget = read("src/components/time/timer-widget.tsx");
const dialog = read("src/components/time/stop-timer-dialog.tsx");
const newTimer = read("src/components/time/new-timer-dialog.tsx");
const activeCard = read("src/components/time/active-timer-card.tsx");

describe("timer completion task selection", () => {
  it("keeps empty timer start supported", () => {
    expect(newTimer).toContain("startTimer({ workspaceId })");
    expect(widget).toContain("handleStartEmpty");
  });

  it("stops immediately from main timer widget without opening a form", () => {
    expect(widget).toContain("await stopTimer(activeTimer.id)");
    expect(widget).not.toContain("setStopDialogOpen(true)");
    expect(widget).not.toContain("<StopTimerDialog");
  });

  it("stops immediately from active timer card and keeps timer visible on failure", () => {
    expect(activeCard).toContain("stopTimer(timer.id)");
    expect(activeCard).not.toContain("<StopTimerDialog");
    expect(activeCard).not.toContain("setStopDialogOpen(true)");
    expect(activeCard).toContain("catch (error)");
  });

  it("keeps optional completion metadata supported by server action", () => {
    expect(dialog).toContain("description.trim() || null");
  });
});
