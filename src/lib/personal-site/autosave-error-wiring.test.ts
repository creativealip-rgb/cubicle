import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("surfaces localized personal-site autosave errors", () => {
  const client = readFileSync("src/components/site/canvas/canvas-page-client.tsx", "utf8");
  const editor = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
  expect(client).toContain('throw new Error("PERSONAL_SITE_SLUG_TAKEN")');
  expect(editor).toContain('toast.error(');
  expect(editor).toContain('"Slug is already in use. Choose another public address."');
  expect(editor).toContain('"Changes were not saved. Try again."');
  expect(editor).not.toContain("silent fail for auto-save");
});