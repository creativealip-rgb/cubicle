import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

it("localizes personal-site editor chrome and accessibility labels", () => {
  const files = [
    "src/components/site/canvas/canvas-page-client.tsx",
    "src/components/site/canvas/properties-panel.tsx",
    "src/components/site/canvas/canvas-renderer.tsx",
    "src/components/site/canvas/canvas-section.tsx",
    "src/components/site/canvas/mobile-step-editor.tsx",
    "src/components/site/canvas/image-upload.tsx",
  ].map(read).join("\n");
  for (const english of [
    "Loading Landing Page Editor...",
    "Failed to generate copy.",
    "Copy applied to section.",
    "Business name",
    "Target audience",
    "A short invitation for visitors",
    "Image description",
    "Enter an embed URL",
    "Table of Contents",
    "Move section up",
    "Remove image",
  ]) expect(files).toContain(english);
  for (const stale of [
    'placeholder="Nama bisnis"',
    'placeholder="Deskripsi gambar"',
    'aria-label="Move up"',
    'aria-label="Delete"',
    'aria-label="Drag to reorder"',
    "silent fail for auto-save",
  ]) expect(files).not.toContain(stale);
});
