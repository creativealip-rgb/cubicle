import { describe, expect, it } from "vitest";
import { normalizeEmbedUrl, safeEmbedSrc } from "./personal-site/model";

describe("personal-site embed URLs", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=4", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeEmbedUrl(input)).toBe(expected);
    expect(safeEmbedSrc(input)).toBe(expected);
  });

  it("wraps regular Figma URLs", () => {
    const input = "https://www.figma.com/design/abc/Test";
    expect(normalizeEmbedUrl(input)).toBe(`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(input)}`);
  });

  it("rejects non-http iframe sources", () => {
    expect(safeEmbedSrc("javascript:alert(1)")).toBe("");
    expect(safeEmbedSrc("/relative/path")).toBe("");
  });
});