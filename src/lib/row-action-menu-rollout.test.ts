import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "src/components/projects/project-status-edit-dialog.tsx",
  "src/components/activities/activity-catalog.tsx",
  "src/components/template-center-client.tsx",
  "src/components/tasks/task-template-workspace.tsx",
  "src/components/expenses/edit-expense-button.tsx",
  "src/components/packages/package-catalog.tsx",
  "src/components/services/service-catalog.tsx",
];

describe("row action menu rollout", () => {
  it.each(files)("uses an ellipsis dropdown in %s", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).toContain("DropdownMenuTrigger");
    expect(source).toMatch(/MoreHorizontal|Ellipsis/);
  });
});
