import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("legacy personal-site links", () => {
  it("does not render uneditable global links in canvas or public page", () => {
    const canvas = readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8");
    const live = readFileSync("src/components/site/personal-site-renderer.tsx", "utf8");
    expect(canvas).not.toContain("site.links.map");
    expect(live).not.toContain("visibleLinks");
  });
});