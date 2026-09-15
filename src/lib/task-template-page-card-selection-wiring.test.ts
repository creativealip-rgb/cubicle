import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/components/tasks/task-template-workspace.tsx", "utf8");
const dialog = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("task template page card selection", () => {
  it("selects the full template card before import and passes it into the dialog", () => {
    expect(workspace).toContain('aria-pressed={selectedTemplateId === template.id}');
    expect(workspace).toContain('setSelectedTemplateId((current) => current === template.id ? null : template.id)');
    expect(workspace).toContain('selectedTemplateId={selectedTemplateId}');
    expect(dialog).toContain('void loadPreview([selectedTemplateId], nextProjectId)');
  });

  it("keeps nested edit and item controls independent", () => {
    expect(workspace).toContain('closest("button, input, select, textarea, a")');
    expect(workspace).toContain("event.target !== event.currentTarget");
  });

  it("requires destination project inside import dialog instead of toolbar", () => {
    expect(workspace).not.toContain('t("Terapkan ke Proyek:", "Apply to Project:")');
    expect(workspace).toContain("projects={projects}");
    expect(dialog).toContain('t("Cari project tujuan...", "Search destination project...")');
    expect(dialog).toContain("groupedProjects.map(([clientName, group])");
    expect(dialog).toContain("project.clientName");
    expect(dialog).toContain("setProjectSearchOpen(true)");
    expect(dialog).toContain('onTouchMove={(event) => event.stopPropagation()}');
    expect(dialog).toContain("max-h-[min(15rem,45dvh)]");
    expect(dialog).toContain('disabled={loading || !projectId');
    expect(dialog).toContain('t("subtask ke", "subtasks into")');
  });
});
