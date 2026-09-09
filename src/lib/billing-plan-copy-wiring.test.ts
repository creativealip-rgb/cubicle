import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landing = readFileSync("src/app/page.tsx", "utf8");
const billing = readFileSync("src/app/(app)/app/billing/page.tsx", "utf8");

describe("billing copy package limits", () => {
  it("does not show Team as 5 users", () => {
    expect(landing).not.toContain("5 users");
    expect(billing).not.toContain("5 pengguna");
  });

  it("mentions key Free/Solo/Team benefits without per-file limits", () => {
    const copy = `${landing}\n${billing}`;
    for (const text of ["3 klien", "5 proyek", "10 invoice", "10 AI", "100 AI", "1,000 AI", "Up to 5 members/workspace"]) {
      expect(copy).toContain(text);
    }
    expect(copy).not.toMatch(/\b(?:5|25|50) MB\/file\b/i);
    for (const benefit of [
      "Penyimpanan file aman",
      "Secure file storage",
      "Kelola dan bagikan file klien",
      "Manage and share client files",
      "Penyimpanan bersama untuk tim",
      "Shared storage for your team",
    ]) {
      expect(copy).toContain(benefit);
    }
  });
});
