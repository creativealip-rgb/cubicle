import { describe, expect, it } from "vitest";
import { normalizeTaskTitle, previewTemplateImport } from "@/lib/task-template-import";

describe("task template import policy", () => {
  it("normalizes titles with trim and lowercase only", () => {
    expect(normalizeTaskTitle("  QA  Review  ")).toBe("qa  review");
  });

  it("detects duplicates against existing project task titles and skips them by default", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: ["  QA Review "],
      templates: [{ id: "template-1", items: [{ id: "item-1", title: "qa review", position: 0 }] }],
    });
    expect(item).toMatchObject({ duplicate: true, duplicateAction: "skip", included: false });
  });

  it("retains duplicate keep overrides", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: ["QA"],
      templates: [{ id: "template-1", items: [{ id: "item-1", title: " qa ", position: 0, duplicateAction: "keep" }] }],
    });
    expect(item).toMatchObject({ duplicate: true, duplicateAction: "keep", included: true });
  });

  it("excludes unselected items, preserves selected template array order, and sorts items by position", () => {
    const preview = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: [],
      templates: [
        { id: "selected-first", items: [{ id: "b", title: "B", position: 1 }, { id: "a", title: "A", position: 0 }] },
        { id: "selected-second", items: [{ id: "hidden", title: "Hidden", position: 0, selected: false }, { id: "c", title: "C", position: 1 }] },
      ],
    });
    expect(preview.map(({ templateId, itemId }) => [templateId, itemId])).toEqual([
      ["selected-first", "a"],
      ["selected-first", "b"],
      ["selected-second", "c"],
    ]);
  });

  it("applies workflow todo/medium/active defaults", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: [],
      templates: [{ id: "t", items: [{ id: "i", title: "Build", position: 0 }] }],
    });
    expect(item.defaults).toEqual({ mode: "workflow", status: "todo", priority: "medium", lifecycle: "active" });
  });

  it("applies reusable active defaults without fake workflow fields", () => {
    const [item] = previewTemplateImport({
      mode: "reusable",
      existingProjectTitles: [],
      templates: [{ id: "t", items: [{ id: "i", title: "Support", position: 0 }] }],
    });
    expect(item.defaults).toEqual({ mode: "reusable", lifecycle: "active" });
    expect(item.defaults).not.toHaveProperty("status");
    expect(item.defaults).not.toHaveProperty("priority");
  });
});
