import { describe, expect, it } from "vitest";
import { canCompletePasskeyEnrollment } from "@/lib/mfa/enrollment";

describe("passkey MFA enrollment completion", () => {
  it("requires an authenticated owner with a persisted passkey", () => {
    expect(canCompletePasskeyEnrollment(true, 1)).toBe(true);
    expect(canCompletePasskeyEnrollment(true, 0)).toBe(false);
    expect(canCompletePasskeyEnrollment(false, 1)).toBe(false);
  });
});
