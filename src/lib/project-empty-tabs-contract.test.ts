import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const tasks = readFileSync("src/components/tasks/project-task-workspace.tsx", "utf8");
const billing = readFileSync("src/components/projects/project-billing-tab.tsx", "utf8");

describe("project operational tab empty states", () => {
  it("shows a canonical task empty state without a duplicate action", () => {
    expect(tasks).toContain("<EmptyState");
    expect(tasks).toContain('t("Belum ada tugas", "No tasks yet")');
    expect(tasks).not.toContain("actionNode=");
  });

  it("shows a canonical invoice empty state without a duplicate action", () => {
    expect(billing).toContain("<EmptyState");
    expect(billing).toContain('t("Belum ada invoice", "No invoices yet")');
    expect(billing).not.toContain("actionNode=");
  });
});
