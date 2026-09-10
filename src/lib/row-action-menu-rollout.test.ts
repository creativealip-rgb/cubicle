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

  it("keeps all expense row actions inside one menu", () => {
    const menu = readFileSync("src/components/expenses/edit-expense-button.tsx", "utf8");
    const list = readFileSync("src/components/expenses/expenses-list-table.tsx", "utf8");
    expect(menu).toContain("getExpenseReceiptDownloadUrl");
    expect(menu).toContain("deleteExpense");
    expect(menu.match(/<DropdownMenuItem/g)).toHaveLength(3);
    expect(list).not.toContain("ReceiptLinkButton");
    expect(list).not.toContain("DeleteExpenseButton");
  });

  it("keeps planning transaction actions in one menu and preserves transaction type", () => {
    const source = readFileSync("src/components/expenses/personal-expenses-section.tsx", "utf8");
    expect(source).toContain("MoreHorizontal");
    expect(source).toContain('name="transactionType" value={r.transactionType}');
    expect(source).toContain("PersonalReceiptControl");
  });
});
