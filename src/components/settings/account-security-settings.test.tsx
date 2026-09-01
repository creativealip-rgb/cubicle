import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("src/components/settings/account-security-settings.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/settings/page.tsx", "utf8");

// Wiring check: security settings must expose existing MFA factors and session controls.
describe("account security settings", () => {
  it("renders MFA status, passkeys, recovery, and sessions", () => {
    expect(component).toContain("Two-step verification");
    expect(component).toContain("authClient.passkey.addPasskey");
    expect(component).toContain("/mfa/recovery");
    expect(component).toContain("signOutOtherSessions");
    expect(component).toContain("revokeAccountSession");
  });

  it("receives a server-scoped security snapshot from settings page", () => {
    expect(page).toContain("AccountSecuritySettings");
    expect(page).toContain("twoFactorEnabled");
    expect(page).toContain("credentialPassword");
    expect(page).toContain("passkeyRows");
    expect(page).toContain("sessionRows");
  });
});
