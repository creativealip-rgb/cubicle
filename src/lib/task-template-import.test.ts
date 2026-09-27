import { describe, expect, it } from "vitest";
import { normalizeTaskTitle, previewTemplateImport } from "@/lib/task-template-import";

describe("task template import policy", () => {
  it("normalizes titles with trim and lowercase only", () => {
    expect(normalizeTaskTitle("  QA  Review  ")).toBe("qa  review");
  });

  it("does not compare child titles with standalone project tasks", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: ["  QA Review "],
      templates: [{ id: "template-1", items: [{ id: "item-1", title: "qa review", position: 0 }] }],
    });
    expect(item).toMatchObject({ duplicate: false, duplicateAction: "keep", included: true });
  });

  it("retains duplicate keep overrides", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: ["QA"],
      templates: [{ id: "template-1", items: [{ id: "item-1", title: " qa ", position: 0, duplicateAction: "keep" }] }],
    });
    expect(item).toMatchObject({ duplicate: false, duplicateAction: "keep", included: true });
  });

  it("includes same child titles because each becomes a separate subtask", () => {
    const preview = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: [],
      templates: [
        { id: "first", items: [
          { id: "original", title: " QA Review ", position: 0 },
          { id: "same-template", title: "qa review", position: 1 },
        ] },
        { id: "second", items: [{ id: "cross-template", title: "QA REVIEW", position: 0 }] },
      ],
    });
    expect(preview.every(({ duplicate, included }) => !duplicate && included)).toBe(true);
  });

  it("ignores duplicate actions for standalone-title comparisons", () => {
    const preview = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: ["Deploy"],
      templates: [{ id: "t", items: [
        { id: "kept", title: "deploy", position: 0, duplicateAction: "keep" },
        { id: "skipped", title: "DEPLOY", position: 1, duplicateAction: "skip" },
        { id: "later", title: " Deploy ", position: 2 },
      ] }],
    });
    expect(preview.map(({ itemId, duplicateAction, included }) => ({ itemId, duplicateAction, included }))).toEqual([
      { itemId: "kept", duplicateAction: "keep", included: true },
      { itemId: "skipped", duplicateAction: "keep", included: true },
      { itemId: "later", duplicateAction: "keep", included: true },
    ]);
  });

  it("normalizes skip on a nonduplicate to keep and includes it", () => {
    const [item] = previewTemplateImport({
      mode: "workflow",
      existingProjectTitles: [],
      templates: [{ id: "t", items: [{ id: "i", title: "New", position: 0, duplicateAction: "skip" }] }],
    });
    expect(item).toMatchObject({ duplicate: false, duplicateAction: "keep", included: true });
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

  it("does not mutate source items while sorting preview items", () => {
    const items = [{ id: "b", title: "B", position: 1 }, { id: "a", title: "A", position: 0 }];
    const templates = [{ id: "t", items }];
    previewTemplateImport({ mode: "workflow", existingProjectTitles: [], templates });
    expect(templates[0].items).toBe(items);
    expect(items.map(({ id }) => id)).toEqual(["b", "a"]);
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
