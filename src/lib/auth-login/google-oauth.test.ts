import { describe, expect, it } from "vitest";
import fs from "node:fs";
const auth = fs.readFileSync("src/lib/auth.ts", "utf8"),
  login = fs.readFileSync("src/components/auth/login-form.tsx", "utf8"),
  start = fs.readFileSync(
    "src/app/api/auth/password-login/start/route.ts",
    "utf8",
  );
describe("Google OAuth isolation", () => {
  it("keeps Google provider and button outside custom password OTP endpoints", () => {
    expect(auth).toContain("socialProviders");
    expect(auth).toContain("google:");
    expect(login).toContain("<GoogleAuthButton");
    expect(start).not.toMatch(/google|oauth/i);
  });
});
