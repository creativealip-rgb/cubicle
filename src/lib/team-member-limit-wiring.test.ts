import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const plan = readFileSync("src/lib/plan.ts", "utf8");
const team = readFileSync("src/lib/actions/team.ts", "utf8");
const members = readFileSync("src/lib/actions/workspace-members.ts", "utf8");

describe("workspace member limit wiring", () => {
  it("has reusable member count gate", () => {
    expect(plan).toContain("canAddWorkspaceMember");
    expect(plan).toContain("maxMembers > 0");
    expect(plan).toContain("workspaceMembers.workspaceId");
  });

  it("invite paths use member count gate", () => {
    expect(team).toContain("canAddWorkspaceMember");
    expect(members).toContain("canAddWorkspaceMember");
  });
});
