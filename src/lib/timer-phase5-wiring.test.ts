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

  it.skip("keeps legacy navbar stop redirect (topbar now exposes direct timer controls)", () => {
    const topbar = read("src/components/app-topbar.tsx");

    expect(topbar).toContain('if (!activeTimer.projectId)');
    expect(topbar).toContain('router.push("/app/time")');
    expect(topbar).not.toContain("updateActiveTimerMetadata");
  });
});
