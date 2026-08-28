import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const manual = read("src/components/time/add-time-log-dialog.tsx");

describe("manual Time task UI", () => {
  it("requires Project and Task and exposes complete manual billing metadata", () => {
    expect(manual).toContain('t("Tugas wajib dipilih untuk proyek ini", "Task is required for this project")');
    expect(manual).toContain('id="manual-time-task"');
    expect(manual).toContain('aria-label={projectId ? t("Cari tugas...", "Search task...") : t("Pilih klien & proyek dulu", "Select client & project first")}');
    expect(manual).not.toContain("activityId");
    // Tag label uses i18n pattern
    expect(manual).toMatch(/Label.*?t\("Tag"/);
    expect(manual).toContain('t("Bisa Ditagih", "Billable")');
    expect(manual).toContain('t("Durasi (HH:MM:SS)", "Duration (hh:mm:ss)")');
    expect(manual).toContain("billingType");
    expect(manual).toContain('status: "approved"');
    expect(manual).toContain("tags:");
  });
});
