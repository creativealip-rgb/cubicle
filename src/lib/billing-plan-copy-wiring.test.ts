import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landing = readFileSync("src/app/page.tsx", "utf8");
const billing = readFileSync("src/app/(app)/app/billing/page.tsx", "utf8");

describe("billing copy package limits", () => {
  it("does not show Team as 5 users", () => {
    expect(landing).not.toContain("5 users");
    expect(billing).not.toContain("5 pengguna");
  });

  it("mentions key Free/Solo/Team limits", () => {
    for (const text of ["3 klien", "5 proyek", "10 invoice", "15 AI", "500 AI", "Unlimited users", "25 MB", "50 MB"]) {
      expect(`${landing}\n${billing}`).toContain(text);
    }
  });
});
