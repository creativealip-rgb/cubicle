import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const weekly = readFileSync("src/components/time/weekly-time-grid.tsx", "utf8");
const timesheet = readFileSync("src/components/time/timesheet.tsx", "utf8");
const route = readFileSync("src/components/time/time-route-content.tsx", "utf8");

describe("weekly time picker parity", () => {
  it("passes template provenance into weekly and edit pickers", () => {
    expect(route).toContain("templateName: t.templateName");
    expect(route).toContain("customerRef: project.clientId");
    expect(weekly).toContain("templateName?: string | null");
    expect(timesheet).toContain("templateName?: string | null");
  });

  it("groups projects by client and tasks by template source", () => {
    expect(weekly).toContain("groupedFooterProjects.map(([clientName, group])");
    expect(timesheet).toContain("groupedEditProjectOptions.map(([clientName, group])");
    expect(weekly).toContain('task.templateName || t("Tugas manual", "Manual tasks")');
    expect(timesheet).toContain('task.templateName || t("Tugas manual", "Manual tasks")');
  });

  it("does not show edit validation before save", () => {
    expect(timesheet).toContain("const [editSubmitted, setEditSubmitted] = useState(false)");
    expect(timesheet).toContain("const editClientError = editSubmitted && !editClientId");
  });

  it("offers matching task creation and template import actions", () => {
    for (const source of [weekly, timesheet]) {
      expect(source).toContain('t("Buat task baru", "Create new task")');
      expect(source).toContain('t("Import dari template", "Import from template")');
      expect(source).toContain("shrink-0");
    }
  });
});
