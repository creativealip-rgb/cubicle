import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/portal/portal-request-list.tsx", "utf8");

describe("portal request icon layout", () => {
  it("keeps the icon tile square when request content gets crowded", () => {
    expect(source).toContain("h-8 w-8 shrink-0");
    expect(source).toContain("items-center justify-center");
  });
});
