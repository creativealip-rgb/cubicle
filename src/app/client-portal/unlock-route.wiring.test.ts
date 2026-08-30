import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./[token]/unlock/route.ts", import.meta.url), "utf8");

describe("client portal unlock route", () => {
  it("redirects accidental GET visits back to the portal page", () => {
    expect(source).toContain("export async function GET");
    expect(source).toContain("/client-portal/${slug}");
    expect(source).toContain(", 303)");
  });
});
