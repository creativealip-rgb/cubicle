import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  "src/components/settings/account-security-settings.tsx",
  "utf8",
);
const page = readFileSync("src/app/(app)/app/settings/page.tsx", "utf8");

// Wiring check: Settings exposes recovery factors while legacy TOTP UI stays hidden.
describe("account security settings", () => {
  it("renders MFA status, passkeys, recovery, and sessions", () => {
    expect(component).toContain("Recovery methods");
    expect(component).not.toContain("Two-step verification");
    expect(component).toContain("authClient.passkey.addPasskey");
    expect(component).toContain("/mfa/recovery");
    expect(component).toContain("logoutAllDevices");
    expect(component).toContain("revokeTrustedDevice");
  });

  it("receives a server-scoped security snapshot from settings page", () => {
    expect(page).toContain("AccountSecuritySettings");
    expect(page).toContain("twoFactorEnabled");
    expect(page).toContain("credentialPassword");
    expect(page).toContain("passkeyRows");
    expect(page).toContain("trustedDeviceRows");
  });

  it("limits sessions and keeps the bulk action above the list", () => {
    expect(page).toMatch(
      /trustedDeviceRows[\s\S]*?orderBy\(desc\(authTrustedDevices\.lastUsedAt\)\)/,
    );
    expect(component.indexOf("logoutAllDevices")).toBeLessThan(
      component.indexOf("trustedDevices.map"),
    );
    expect(component).toContain("friendlyDeviceName");
  });
});
