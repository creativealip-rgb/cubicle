import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing-aware Waktu Phase 2", () => {
  it("groups weekly rows by Project and Task without Activity", () => {
    const grid = read("src/lib/weekly-time-grid.ts");
    const component = read("src/components/time/weekly-time-grid.tsx");
    expect(grid).toContain('`${entry.projectId}:${entry.taskId');
    expect(grid).toContain("taskTitle");
    expect(component).toContain("Project / Task");
    expect(component).not.toContain("activityId");
    expect(component).not.toContain("ActivityOption");
  });

  it("uses effective work date for weekly grouping and approval ranges", () => {
    const grid = read("src/lib/weekly-time-grid.ts");
    const approval = read("src/lib/actions/timesheet-approval.ts");
    expect(grid).toContain("effectiveWorkDate(entry)");
    expect(approval).toContain("timeEntries.workDate");
    expect(approval).not.toContain("gte(timeEntries.startTime");
  });

  it("blocks self approval and supports writable admin reviewers", () => {
    const approval = read("src/lib/actions/timesheet-approval.ts");
    expect(approval).toContain("assertWorkspaceWritable");
    expect(approval).toContain("submission.userId === user.id");
    expect(approval).toContain("Tidak dapat menyetujui timesheet sendiri");
  });

  it("keeps submitter and per-submission review notes isolated", () => {
    const panel = read("src/components/time/timesheet-approval-panel.tsx");
    expect(panel).toContain("submitterNote");
    expect(panel).toContain("reviewNotes");
    expect(panel).toContain("Kirim Minggu Ini");
    expect(panel).toContain("Tinjau");
  });
});
