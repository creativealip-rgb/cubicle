import { describe, expect, it } from "vitest";
import {
  canonicalTaskTemplateImportFingerprint,
  isTaskTemplateTargetCompatible,
} from "@/lib/task-template-import-policies";

describe("task template import action policies", () => {
  it("matches template targets to project billing", () => {
    expect(isTaskTemplateTargetCompatible("fixed_price", "fixed_price")).toBe(true);
    expect(isTaskTemplateTargetCompatible("all", "retainer")).toBe(true);
    expect(isTaskTemplateTargetCompatible("hourly_retainer", "hourly")).toBe(true);
    expect(isTaskTemplateTargetCompatible("hourly_retainer", "retainer")).toBe(true);
    expect(isTaskTemplateTargetCompatible("fixed_price", "hourly")).toBe(false);
  });

  it("creates stable fingerprints independent of object key order", () => {
    const a = canonicalTaskTemplateImportFingerprint({ projectId: "p", templateIds: ["t1"], selectedItems: [{ itemId: "i", duplicateAction: "keep" }] });
    const b = canonicalTaskTemplateImportFingerprint({ selectedItems: [{ duplicateAction: "keep", itemId: "i" }], templateIds: ["t1"], projectId: "p" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
