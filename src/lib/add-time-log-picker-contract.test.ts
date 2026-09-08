import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dialog = readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");


describe("add time log pickers", () => {
  it("uses click-open portaled project and task pickers", () => {
    expect(dialog).toContain("<Popover open={projectSearchOpen}");
    expect(dialog).toContain("<Popover open={taskSearchOpen}");
    expect(dialog).toContain("setProjectSearchOpen((current) => !current)");
    expect(dialog).toContain("setTaskSearchOpen((current) => !current)");
  });

  it("uses concise labels, search copy, and readable rows", () => {
    expect(dialog).toContain('t("Proyek *", "Project *")');
    expect(dialog).toContain('t("Cari proyek / klien", "Search project / client")');
    expect(dialog).toContain("min-h-10 w-full");
    expect(dialog).toContain("text-sm");
  });

  it("groups no-client projects first, then clients and projects alphabetically", () => {
    expect(dialog).toContain("groupedProjectOptions");
    expect(dialog).toContain('clientId === "" ? -1');
    expect(dialog).toContain("localeCompare");
    expect(dialog).toContain('t("Tanpa Klien", "No client")');
  });
});
