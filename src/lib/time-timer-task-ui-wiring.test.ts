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

  it("opens completion dialog instead of quick-stopping from main timer widget", () => {
    expect(widget).toContain("setStopDialogOpen(true)");
    expect(widget).not.toContain("await stopTimer(activeTimer.id)");
    expect(widget).toContain("<StopTimerDialog");
  });

  it("requires Task in completion dialog and keeps dialog open on failure", () => {
    expect(dialog).toContain("taskRequired && !taskId");
    expect(dialog).toContain("Klien, Project, dan Task wajib dipilih");
    expect(dialog).not.toContain('t("Aktivitas", "Activity")');
    expect(dialog).toContain('!taskRequired ? <SelectItem value="__none__"');
    const close = dialog.indexOf("onOpenChange(false)");
    const catchBlock = dialog.indexOf("} catch (err: unknown)");
    expect(close).toBeGreaterThan(-1);
    expect(catchBlock).toBeGreaterThan(close);
  });

  it("keeps failed quick-stop surfaces visible through server error handling", () => {
    expect(activeCard).toContain("<StopTimerDialog");
    expect(activeCard).toContain("setStopDialogOpen(true)");
    expect(activeCard).not.toContain("stopTimer(timer.id)");
  });
});
