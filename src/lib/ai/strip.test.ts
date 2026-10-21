import { describe, expect, it } from "vitest";
import { stripThinking } from "./strip";

describe("stripThinking", () => {
  it("preserves streaming delta whitespace when requested", () => {
    const deltas = ["Halo.", " Mau", " cek", " apa?"];
    expect(deltas.map((delta) => stripThinking(delta, false)).join(""))
      .toBe("Halo. Mau cek apa?");
  });

  it("keeps trimmed behavior for complete responses", () => {
    expect(stripThinking("  Halo.  ")).toBe("Halo.");
  });
});