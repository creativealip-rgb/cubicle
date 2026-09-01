import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./[token]/unlock/route.ts", import.meta.url), "utf8");

describe("client portal unlock route", () => {
  it("redirects accidental GET visits back to the portal page", () => {
    expect(source).toContain("export async function GET");
    expect(source).toContain("function portalRedirect");
    expect(source).toContain("Redirecting to client portal");
    expect(source.match(/portalRedirect\(/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).not.toContain("NextResponse.redirect");
  });
});
