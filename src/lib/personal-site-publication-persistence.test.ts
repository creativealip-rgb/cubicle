import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");

describe("personal site publication persistence", () => {
  it("persists publish state before updating the optimistic UI", () => {
    const handler = source.slice(source.indexOf("const handlePublication"), source.indexOf("const handleSelectReadinessIssue"));
    expect(handler).toContain("await onSave(next);");
    expect(handler.indexOf("await onSave(next);")).toBeLessThan(handler.indexOf("setSite(next);"));
    expect(source).toContain("onClick={() => void handlePublication(showPublishConfirm)}");
    expect(source).not.toContain("updateSite({ published: showPublishConfirm });");
    expect(source).toContain("aria-busy={saving}");
  });
});
