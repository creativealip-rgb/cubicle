import { describe, expect, it } from "vitest";
import { latestProductUpdateId, productUpdates } from "./product-updates";

describe("product updates", () => {
  it("exposes the newest release as latest", () => {
    expect(latestProductUpdateId).toBe(productUpdates[0]?.id);
  });

  it("keeps releases newest first", () => {
    const dates = productUpdates.map((release) => release.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("uses supported item categories", () => {
    const supported = new Set(["new", "improvement", "fix"]);
    expect(productUpdates.flatMap((release) => release.items).every((item) => supported.has(item.type))).toBe(true);
  });
});
