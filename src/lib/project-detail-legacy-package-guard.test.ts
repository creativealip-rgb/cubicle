import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/projects/[projectId]/page.tsx", "utf8");

describe("project detail legacy Package guard", () => {
  it("renders historical tasks read-only without resolving a writable mode", () => {
    expect(page).toContain('const legacyPackageReadOnly = billingModel === "legacy_package"');
    expect(page).toContain("legacyPackageReadOnly ?");
    expect(page).toContain("WorkflowTaskWorkspace");
    expect(page).toContain("Project Paket legacy bersifat hanya baca");
    expect(page).toContain('resolveProjectTaskMode(project.taskModePolicy, billingModel)');
  });
});
