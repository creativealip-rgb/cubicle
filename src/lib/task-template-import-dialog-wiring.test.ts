import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("task template import dialog", () => {
  it("uses preview and atomic import actions", () => {
    expect(source).toContain("previewTaskTemplateImport");
    expect(source).toContain("importTaskTemplates");
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
