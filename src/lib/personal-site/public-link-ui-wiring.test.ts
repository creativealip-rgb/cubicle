import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("shows public URL with copy and open actions in publish dialog", () => {
  const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
  expect(source).toMatch(/data-testid=["']personal-site-public-url["'][\s\S]*?break-all/);
  expect(source).toMatch(/navigator\.clipboard\.writeText\(publicUrl\)/);
  expect(source).toMatch(/t\("Salin link",\s*"Copy link"\)/);
  expect(source).toMatch(/t\("Buka situs",\s*"Open site"\)/);
  expect(source).toMatch(/href=\{publicUrl\}/);
});

it("labels preview separately from public site", () => {
  const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
  expect(source).toMatch(/t\("Link publik",\s*"Public link"\)/);
  expect(source).toMatch(/t\("Preview",\s*"Preview"\)/);
});
