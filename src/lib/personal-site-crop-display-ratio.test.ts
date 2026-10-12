import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { personalSiteSectionSchema } from "./personal-site/model";

describe("personal-site cropped image display ratio", () => {
  it("stores hero crop ratio in the section schema", () => {
    const parsed = personalSiteSectionSchema.parse({
      id: "hero",
      type: "hero",
      heading: "Hero",
      subtitle: "",
      content: "Copy",
      imageUrl: "/hero.webp",
      imageAspectRatio: 3 / 4,
    });
    expect(parsed.type === "hero" && parsed.imageAspectRatio).toBe(3 / 4);
  });

  it("wires crop ratio into builder and public hero wrappers", () => {
    const crop = readFileSync("src/components/site/canvas/image-crop-modal.tsx", "utf8");
    const canvas = readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8");
    const live = readFileSync("src/components/site/personal-site-renderer.tsx", "utf8");
    expect(crop).toContain("onCropComplete(data.url, width / height)");
    expect(canvas).toContain("aspectRatio: section.imageAspectRatio");
    expect(live).toContain("aspectRatio: section.imageAspectRatio");
  });
});
