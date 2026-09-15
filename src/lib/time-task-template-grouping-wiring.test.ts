import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/components/time/time-route-content.tsx", "utf8");
const dialog = readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");

describe("time task template context", () => {
  it("passes template source names into grouped manual time task picker", () => {
    expect(route).toContain("templateName:");
    expect(route).toContain("templateItemSourceId");
    expect(dialog).toContain("groupedTaskOptions.map(([templateName, group])");
    expect(dialog).toContain("task.templateName");
  });

  it("only offers None when selected project has no tasks", () => {
    expect(dialog).toContain("projectTasks.length === 0 &&");
  });

  it("offers task creation and template import at end of picker", () => {
    expect(dialog).toContain('t("Buat task baru", "Create new task")');
    expect(dialog).toContain('t("Import dari template", "Import from template")');
    expect(dialog).toContain("shrink-0 space-y-0.5 border-t");
  });
});
