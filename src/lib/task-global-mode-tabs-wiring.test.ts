import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");
const tabs = readFileSync("src/components/tasks/task-page-tabs.tsx", "utf8");
const dialog = readFileSync("src/components/tasks/task-create-dialog.tsx", "utf8");
const form = readFileSync("src/components/forms/task-form.tsx", "utf8");

describe("global task mode navigation", () => {
  it("renders separate one-time, recurring, and template tabs", () => {
    expect(tabs).toContain('"workflow" | "reusable" | "templates"');
    expect(tabs).toContain('t("Sekali", "One-time")');
    expect(tabs).toContain('t("Berulang", "Recurring")');
    expect(tabs).toContain('t("Template", "Templates")');
    expect(page).toContain('eq(tasks.mode, tab === "templates" ? "workflow" : tab)');
  });

  it("uses reusable workspace only for recurring tasks", () => {
    expect(page).toContain("<ReusableTaskWorkspace");
    expect(page).toContain('tab === "reusable"');
    expect(page).toContain("monthMinutes");
    expect(page).toContain("lastUsedAt");
  });

  it("passes the selected task mode from dialog through form submit", () => {
    expect(page).toContain("defaultTaskMode={tab}");
    expect(dialog).toContain("taskMode={defaultTaskMode}");
    expect(form).toContain('name="taskMode"');
    expect(form).toContain("selectedTaskMode");
    expect(form).toContain("mode: selectedTaskMode");
    expect(form).not.toContain("mode: taskMode,");
  });
});
