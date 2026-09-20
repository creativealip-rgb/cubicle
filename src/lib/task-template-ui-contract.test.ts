import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync("src/components/tasks/task-template-workspace.tsx", "utf8");
const importDialogSource = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("task template UI contract", () => {
  it("keeps template cards compact with target hidden and actions in the menu", () => {
    expect(workspaceSource).not.toContain('t("Semua Proyek", "All Projects")');
    expect(workspaceSource).not.toContain("targetName");
    expect(workspaceSource).not.toContain("Card Footer Actions");
    const menuStart = workspaceSource.indexOf("<DropdownMenuContent align=\"end\">");
    const menuEnd = workspaceSource.indexOf("</DropdownMenuContent>", menuStart);
    const menuSource = workspaceSource.slice(menuStart, menuEnd);

    expect(menuSource).toContain('t("Ubah", "Edit")');
    expect(menuSource).toContain("archiveTaskTemplate");
    expect(menuSource).toContain("duplicateTaskTemplate");
  });

  it("removes refresh preview after preview is loaded", () => {
    expect(importDialogSource).not.toContain("Refresh preview");
    expect(importDialogSource).not.toContain("Muat ulang preview");
    expect(importDialogSource).toContain("View Preview");
    expect(importDialogSource).not.toContain("subtasks into");
    expect(importDialogSource).not.toContain("subtask ke");
  });
});
