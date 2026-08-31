import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(__dirname + "/canvas-editor.tsx", "utf8");
const dialog = source.slice(
  source.indexOf("{/* Publish / Unpublish confirmation dialog */}"),
  source.indexOf("function DraggableTemplateButton"),
);

describe("desktop personal-site publish dialog", () => {
  it("offers the same plan-gated custom slug control as mobile", () => {
    expect(dialog).toContain('data-testid="personal-site-slug-input"');
    expect(dialog).toContain("disabled={!canEditSlug}");
    expect(dialog).toContain("readOnly={!canEditSlug}");
    expect(dialog).toContain("Free uses your workspace slug. Upgrade to use a custom slug.");
    expect(dialog).toContain('href="/app/billing"');
  });
});
