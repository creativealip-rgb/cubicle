import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/app-topbar.tsx", "utf8");

describe("workspace switcher labels", () => {
  it("keeps main workspace item above team section without a main workspace label", () => {
    expect(source).not.toContain("Main Workspace");
    expect(source).not.toContain("Workspace utama");
    expect(source).toContain("mainWorkspace.map(renderWorkspace)");
    expect(source).toContain("Team Workspaces");
    expect(source.indexOf("mainWorkspace.map(renderWorkspace)")).toBeLessThan(source.indexOf("Team Workspaces"));
  });
});
