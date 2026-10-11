import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/page.tsx", "utf8");

describe("public landing page contract", () => {
  it("sends auth CTAs directly to the app origin without cross-origin RSC prefetch", () => {
    expect(page).toContain('const APP_URL = "https://app.cubiqlo.com"');
    expect(page).not.toContain('href="/login"');
    expect(page).not.toContain('href="/signup"');
    expect(page).toContain('href={`${APP_URL}/login`}');
    expect(page).toContain('href={`${APP_URL}/signup`}');
  });

  it("uses the Cobalt brand palette without purple glow remnants", () => {
    expect(page).toContain("rgba(37,99,235,.15)");
    expect(page).not.toContain("rgba(102,71,240");
    expect(page).not.toContain("#6C5CE7");
  });
});
