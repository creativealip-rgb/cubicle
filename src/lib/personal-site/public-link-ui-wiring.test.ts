import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("shows public URL with copy and open actions in publish dialog", () => {
  const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
  expect(source).toContain("data-testid=\"personal-site-public-url\"");
  expect(source).toContain("navigator.clipboard.writeText(publicUrl)");
  expect(source).toContain('t("Salin link", "Copy link")');
  expect(source).toContain('t("Buka situs", "Open site")');
  expect(source).toContain('href={publicUrl}');
  expect(source).toContain('break-all');
});

it("labels preview separately from public site", () => {
  const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
  expect(source).toContain('t("Link publik", "Public link")');
  expect(source).toContain('t("Pratinjau", "Preview")');
});
