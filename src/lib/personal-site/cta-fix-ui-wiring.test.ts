import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const editor = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
const mobile = readFileSync("src/components/site/canvas/mobile-step-editor.tsx", "utf8");

it("offers explicit CTA pairing controls in desktop publish panel", () => {
  expect(editor).toContain('t("Label CTA", "CTA label")');
  expect(editor).toContain('t("Tujuan CTA", "CTA destination")');
  expect(editor).toContain('updateSite({ ctaLabel: "", ctaUrl: "" })');
  expect(editor).toContain('t("Hapus CTA", "Clear CTA")');
});

it("offers CTA pairing controls in mobile publish step", () => {
  expect(mobile).toContain('t("Label CTA", "CTA label")');
  expect(mobile).toContain('t("Tujuan CTA", "CTA destination")');
  expect(mobile).toContain('onUpdateSite({ ctaLabel: "", ctaUrl: "" })');
});

it("opens publish panel for CTA readiness issues", () => {
  expect(editor).toContain('setShowPublishConfirm(true)');
});
