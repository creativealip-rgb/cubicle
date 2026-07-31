import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  nextDuplicateTemplateName,
  parseGetTaskTemplatesOptions,
  parseTaskTemplateInput,
  parseTaskTemplateItemInput,
  parseTaskTemplateUpdateInput,
  planTaskTemplateItemReorder,
} from "@/lib/actions/task-templates";

const source = readFileSync("src/lib/actions/task-templates.ts", "utf8");

describe("task template action domain rules", () => {
  it("validates template target, status, name, and description", async () => {
    await expect(parseTaskTemplateInput({ name: "  Kickoff  ", description: "  Notes  ", target: "all", status: "active" })).resolves.toEqual({
      name: "Kickoff",
      description: "Notes",
      target: "all",
      status: "active",
    });
    await expect(parseTaskTemplateInput({ name: " ", target: "all", status: "active" })).rejects.toThrow();
    await expect(parseTaskTemplateInput({ name: "X", target: "invalid", status: "active" })).rejects.toThrow();
    await expect(parseTaskTemplateInput({ name: "X", target: "all", status: "deleted" })).rejects.toThrow();
  });

  it("validates item title, description, assignee, and non-negative position", async () => {
    await expect(parseTaskTemplateItemInput({ title: "  Brief  ", description: "  Copy  ", defaultAssigneeId: null, position: 0 })).resolves.toEqual({
      title: "Brief",
      description: "Copy",
      defaultAssigneeId: null,
      position: 0,
    });
    await expect(parseTaskTemplateItemInput({ title: " ", position: 0 })).rejects.toThrow();
    await expect(parseTaskTemplateItemInput({ title: "X", position: -1 })).rejects.toThrow();
    await expect(parseTaskTemplateItemInput({ title: "X", position: 1.5 })).rejects.toThrow();
  });

  it("increments collision-safe Indonesian duplicate names by normalized comparison", async () => {
    await expect(nextDuplicateTemplateName("Nama", ["Other"])).resolves.toBe("Nama (Salinan)");
    await expect(nextDuplicateTemplateName("Nama", [" nama (salinan) ", "NAMA (SALINAN 2)"])).resolves.toBe("Nama (Salinan 3)");
  });

  it("keeps absent update status absent instead of applying create default", async () => {
    await expect(parseTaskTemplateUpdateInput({ name: "  Baru  " })).resolves.toEqual({ name: "Baru" });
    await expect(parseTaskTemplateUpdateInput({})).rejects.toThrow("No changes supplied");
  });

  it("strictly validates task template query options and applies defaults", async () => {
    const id = "9f3b82a1-3a6d-4ec3-b3ab-92f72db5e88f";
    await expect(parseGetTaskTemplatesOptions(undefined)).resolves.toEqual({ includeArchived: false });
    await expect(parseGetTaskTemplatesOptions({ includeArchived: true, templateId: id })).resolves.toEqual({ includeArchived: true, templateId: id });
    await expect(parseGetTaskTemplatesOptions({ includeArchived: "yes" })).rejects.toThrow();
    await expect(parseGetTaskTemplatesOptions({ templateId: "not-a-uuid" })).rejects.toThrow();
    await expect(parseGetTaskTemplatesOptions({ unknown: true })).rejects.toThrow();
  });

  it("requires complete unique reorder and puts temporary positions above sparse current max", async () => {
    await expect(planTaskTemplateItemReorder([
      { id: "a", position: 0 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ], ["c", "a", "b"])).resolves.toEqual({
      temporary: [{ id: "c", position: 4 }, { id: "a", position: 5 }, { id: "b", position: 6 }],
      final: [{ id: "c", position: 0 }, { id: "a", position: 1 }, { id: "b", position: 2 }],
    });
    await expect(planTaskTemplateItemReorder([{ id: "a", position: 7 }, { id: "b", position: 20 }], ["b", "a"])).resolves.toEqual({
      temporary: [{ id: "b", position: 21 }, { id: "a", position: 22 }],
      final: [{ id: "b", position: 0 }, { id: "a", position: 1 }],
    });
    await expect(planTaskTemplateItemReorder([{ id: "a", position: 0 }, { id: "b", position: 1 }], ["a"])).rejects.toThrow("complete");
    await expect(planTaskTemplateItemReorder([{ id: "a", position: 0 }, { id: "b", position: 1 }], ["a", "a"])).rejects.toThrow("unique");
    await expect(planTaskTemplateItemReorder([{ id: "a", position: 0 }, { id: "b", position: 1 }], ["a", "x"])).rejects.toThrow("same template");
  });
});

describe("tenant-safe task template action wiring", () => {
  for (const action of [
    "getTaskTemplates",
    "createTaskTemplate",
    "updateTaskTemplate",
    "archiveTaskTemplate",
    "restoreTaskTemplate",
    "duplicateTaskTemplate",
    "createTaskTemplateItem",
    "updateTaskTemplateItem",
    "removeTaskTemplateItem",
    "reorderTaskTemplateItems",
  ]) {
    it(`exports ${action}`, () => expect(source).toMatch(new RegExp(`export async function ${action}\\b`)));
  }

  it("resolves session workspace and enforces writable membership without client workspace input", () => {
    expect(source).toContain("getWorkspaceForCurrentUser");
    expect(source).toContain("assertWorkspaceWritable(db, user.id, workspaceId)");
    expect(source).not.toMatch(/workspaceId\s*:\s*z\./);
  });

  it("tenant-scopes template and item reads and writes", () => {
    expect(source.match(/eq\(taskTemplates\.workspaceId, workspaceId\)/g)?.length).toBeGreaterThanOrEqual(7);
    expect(source.match(/eq\(taskTemplateItems\.workspaceId, workspaceId\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).toContain("eq(taskTemplateItems.templateId, templateId)");
  });

  it("validates composite workspace assignee membership and creator identity", () => {
    expect(source).toContain("eq(workspaceMembers.workspaceId, workspaceId)");
    expect(source).toContain("eq(workspaceMembers.userId, defaultAssigneeId)");
    expect(source).toContain("createdBy: user.id");
  });

  it("guards archived writes and restore conflicts", () => {
    expect(source).toContain("assertActiveTemplate");
    expect(source).toContain("RENAME_REQUIRED");
    expect(source).toMatch(/status:\s*"archived"/);
  });

  it("serializes duplicate-name allocation on stable workspace namespace before reading names", () => {
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("hashtextextended");
    expect(source).toContain("task-template-duplicate-name:");
    expect(source.indexOf("pg_advisory_xact_lock")).toBeLessThan(source.indexOf("const existing = await tx.select"));
  });

  it("duplicates and reorders transactionally without writing generated normalized_name", () => {
    expect(source.match(/db\.transaction/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("planTaskTemplateItemReorder");
    expect(source).toContain("position: taskTemplateItems.position");
    expect(source).not.toMatch(/normalizedName\s*:/);
  });
});
