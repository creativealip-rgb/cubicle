import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("timer phase 5 wiring", () => {
  it("adds an active timer metadata save action without closing the running entry", () => {
    const time = read("src/lib/actions/time.ts");

    expect(time).toContain("const updateActiveTimerMetadataSchema");
    expect(time).toContain("export async function updateActiveTimerMetadata");
    expect(time).toContain("Timer sudah selesai, edit lewat timesheet");
    expect(time).toContain("isNull(timeEntries.endTime)");
    expect(time).toContain("assertActivityWriteAllowed(db, {");
    expect(time).toContain('stage: "edit"');
    expect(time).not.toContain("updateActiveTimerMetadata(input: z.infer<typeof updateTimeEntrySchema>");
  });

  it("wires the Timer page active card to edit running metadata before stop", () => {
    const widget = read("src/components/time/timer-widget.tsx");

    expect(widget).toContain("updateActiveTimerMetadata");
    expect(widget).toContain("editingActiveTimer");
    expect(widget).toContain("handleSaveActiveMetadata");
    expect(widget).toContain("Simpan Detail");
    expect(widget).toContain("Detail timer diperbarui");
    expect(widget).toContain("setSelectedClientId(activeTimer.clientId || \"\")");
    expect(widget).toContain("setSelectedProjectId(activeTimer.projectId || \"\")");
  });

  it("starts and stops empty timers directly from navbar and Timer widget", () => {
    const topbar = read("src/components/app-topbar.tsx");
    const widget = read("src/components/time/timer-widget.tsx");

    // Navbar only displays the running timer; start/stop live in the Timer widget
    expect(topbar).not.toContain("await startTimer({ workspaceId })");
    expect(topbar).not.toContain("if (!activeTimer.projectId)");
    expect(topbar).not.toContain("updateActiveTimerMetadata");
    expect(widget).toContain("await startTimer({ workspaceId })");
    expect(widget).toContain("await stopTimer(activeTimer.id)");
    expect(widget).not.toContain("setStopDialogOpen(true)");
  });
});
