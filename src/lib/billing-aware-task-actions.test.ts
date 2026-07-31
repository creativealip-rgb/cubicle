import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/actions/tasks.ts", "utf8");
const policies = readFileSync("src/lib/task-action-policies.ts", "utf8");

describe("billing-aware task action invariants", () => {
  it("uses canonical task mode and project policy", () => {
    expect(source).toContain("resolveProjectTaskMode");
    expect(source).toContain("taskModePolicy");
    expect(source).toContain("mode: projectMode");
  });

  it("rejects workflow-only fields for reusable tasks", () => {
    expect(source).toContain("assertTaskModeMutationAllowed");
    expect(policies).toContain("Reusable task tidak mendukung field workflow");
  });

  it("archives and restores tasks tenant-safely", () => {
    expect(source).toMatch(/export async function archiveTask\b/);
    expect(source).toMatch(/export async function restoreTask\b/);
    expect(source).toContain("eq(tasks.workspaceId, workspaceId)");
    expect(source).toContain('lifecycle: "archived"');
    expect(source).toContain('lifecycle: "active"');
  });

  it("checks time references before hard delete", () => {
    expect(source).toContain("timeEntries");
    expect(source).toContain("TASK_REFERENCED_BY_TIME");
  });

  it("permits portal review only for workflow tasks", () => {
    expect(source).toContain("mode: tasks.mode");
    expect(source).toContain('row.mode !== "workflow"');
  });
});
