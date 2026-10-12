import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("personal site settings", () => {
  it("exposes editable site identity and SEO without duplicating the /site prefix", () => {
    const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
    expect(source).toContain("updateSite({ title: event.target.value })");
    expect(source).toContain("<SEOPanel site={site}");
    expect(source).not.toContain('publicSiteBaseUrl.replace(/\\/$/, "")}/site/');
  });
});
