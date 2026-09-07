import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const component = readFileSync(
  "src/components/settings/account-security-settings.tsx",
  "utf8",
);
const page = readFileSync("src/app/(app)/app/settings/page.tsx", "utf8");
describe("recovery settings contract", () => {
  it("never exposes raw passkey errors", () => {
    expect(component).toContain("getPasskeyErrorCode");
    expect(component).toContain(
      "if (result.error) throw new Error(result.error.message)",
    );
  });
  it("renders actual trusted-device metadata and controls", () => {
    expect(page).toContain("authTrustedDevices");
    expect(component).toContain("trustedDevices.map");
    expect(component).toContain("expiresAt");
    expect(component).toContain("lastUsedAt");
    expect(component).toContain("revokeTrustedDevice");
    expect(component).toContain("logoutAllDevices");
  });
  it("uses consistent recovery rows and supports passkey removal", () => {
    expect(component).toContain("recovery-method-row");
    expect(component).toContain("Synced passkey");
    expect(component).toContain("Last resort");
    expect(component).toContain("authClient.passkey.deletePasskey");
    expect(component).toContain("useConfirm");
  });
});
