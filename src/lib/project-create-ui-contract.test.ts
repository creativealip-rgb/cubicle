import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const form = readFileSync("src/components/forms/project-form.tsx", "utf8");
const workspace = readFileSync("src/components/tasks/project-task-workspace.tsx", "utf8");
describe("project create UI defaults", () => {
  it("defaults client portal visibility on for new projects", () => {
    expect(form).toContain('defaultValues?.clientVisible ?? (mode === "create" ? true : Boolean(clientId))');
  });
  it("removes duplicate task CTA from workspace", () => {
    expect(workspace).not.toContain("-mt-16");
    expect(workspace).not.toContain("createButton");
  });
});
