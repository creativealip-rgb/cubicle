import { describe, expect, it } from "vitest";
import { buildProjectTaskPresentation } from "./project-task-presentation";

const tasks = [
  { id: "a", position: 2, mode: "reusable" as const, lifecycle: "active", status: "todo" },
  { id: "b", position: 1, mode: "workflow" as const, lifecycle: "active", status: "doing" },
];

describe("Project Task presentation", () => {
  it("preserves every row and input order", () => {
    expect(buildProjectTaskPresentation(tasks, "workflow").map((row) => row.id)).toEqual(["a", "b"]);
  });
  it("derives badge and edit mode from stored mode, not create default", () => {
    const rows = buildProjectTaskPresentation(tasks, "workflow");
    expect(rows[0]).toMatchObject({ modeBadge: "Berulang", editMode: "reusable" });
    expect(rows[1]).toMatchObject({ modeBadge: "Workflow", editMode: "workflow" });
  });
  it("uses Project policy only for create mode", () => {
    expect(buildProjectTaskPresentation(tasks, "reusable")[0].createMode).toBe("reusable");
  });
});
