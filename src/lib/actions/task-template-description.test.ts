import { describe, expect, it } from "vitest";
import { importedSubtaskValues } from "./task-templates";

describe("task template subtask description snapshot", () => {
  it("copies description into real imported subtask values", async () => {
    const source = { title: "Step", description: "Snapshot text", defaultAssigneeId: null, position: 0 };
    const imported = await importedSubtaskValues(source, "workspace-id", "task-id");
    source.description = "Template edited later";
    expect(imported).toMatchObject({ workspaceId: "workspace-id", taskId: "task-id", title: "Step", description: "Snapshot text" });
  });
});