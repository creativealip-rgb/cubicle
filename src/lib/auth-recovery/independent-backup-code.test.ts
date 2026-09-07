import { describe, expect, it } from "vitest";
import { createBackupCodes, verifyBackupCode } from "./independent-backup-code";
describe("independent backup codes", () => {
  it("creates ten unique display codes with hash-only verifiers", () => {
    const rows = createBackupCodes("secret");
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map((x) => x.code)).size).toBe(10);
    expect(rows.every((x) => x.hash && !x.hash.includes(x.code))).toBe(true);
  });
  it("verifies normalized input and rejects wrong code", () => {
    const [row] = createBackupCodes("secret");
    expect(verifyBackupCode(row.hash, row.code.toLowerCase(), "secret")).toBe(
      true,
    );
    expect(verifyBackupCode(row.hash, "WRONG-CODE", "secret")).toBe(false);
  });
});
