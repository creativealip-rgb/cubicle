import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page = readFileSync("src/app/(auth)/two-factor/page.tsx", "utf8");
const forgot = readFileSync(
  "src/components/auth/forgot-password-form.tsx",
  "utf8",
);
const recovery = readFileSync("src/app/(auth)/mfa/recovery/page.tsx", "utf8");
describe("legacy two-factor cutover", () => {
  it("redirects legacy page and removes stale entry links", () => {
    expect(page).toContain('redirect("/recover-access")');
    expect(page).not.toContain("TwoFactorForm");
    expect(forgot).not.toContain('href="/two-factor"');
    expect(recovery).not.toContain('href="/two-factor"');
  });
});
