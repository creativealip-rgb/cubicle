import { describe, expect, it } from "vitest";
import { buildPackageAssignmentArchivePredicate } from "./package-assignment-archive";

describe("buildPackageAssignmentArchivePredicate", () => {
  it("requires workspace, project, and previous assignment id", () => {
    expect(buildPackageAssignmentArchivePredicate("ws-1", "project-1", "assignment-1")).toEqual({
      workspaceId: "ws-1",
      projectId: "project-1",
      sourcePackageAssignmentId: "assignment-1",
    });
  });

  it("does not produce an unscoped predicate without an assignment", () => {
    expect(buildPackageAssignmentArchivePredicate("ws-1", "project-1", null)).toBeNull();
  });
});
