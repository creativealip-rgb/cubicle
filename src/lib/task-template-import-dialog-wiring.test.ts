import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("task template import dialog", () => {
  it("uses preview and atomic import actions", () => {
    expect(source).toContain("previewTaskTemplateImport");
    expect(source).toContain("importTaskTemplates");
  });

  it("opens selected page template directly as task checklist", () => {
    expect(source).toContain("const visibleTemplates = selectedTemplateId");
    expect(source).toContain("void loadPreview([selectedTemplateId], nextProjectId)");
    expect(source).toContain("visibleTemplates.map((template)");
  });

  it("supports selecting or clearing all preview tasks", () => {
    expect(source).toContain("function toggleAllItems");
    expect(source).toContain('type="checkbox" checked={allItemsSelected}');
    expect(source).toContain('t("Pilih semua task", "Select all tasks")');
  });

  it("keeps modal and selected template compact", () => {
    expect(source).toContain("sm:max-w-lg");
    expect(source).toContain("mx-auto w-full max-w-sm");
    expect(source).toContain("flex-col items-start");
  });

  it("supports multiple templates, item selection, and duplicate decisions", () => {
    expect(source).toContain("selectedTemplateIds");
    expect(source).toContain("selectedItems");
    expect(source).toContain("Lewati");
    expect(source).toContain("Tetap tambahkan");
  });

  it("warns on compatibility override and reuses idempotency key", () => {
    expect(source).toContain("allowIncompatibleTarget");
    expect(source).toContain("idempotencyKeyRef");
    expect(source).toContain("crypto.randomUUID");
  });

  it("refreshes preview fingerprint from exact submit decisions", () => {
    expect(source).toContain("const freshPreview = await previewTaskTemplateImport(importPayload)");
    expect(source).toContain("previewFingerprint: freshPreview.payloadFingerprint");
  });

  it("shows flat result without project groups", () => {
    expect(source).toContain("Tugas berhasil ditambahkan");
    expect(source).not.toMatch(/create(Group|TaskList)|parentId/);
  });
});
