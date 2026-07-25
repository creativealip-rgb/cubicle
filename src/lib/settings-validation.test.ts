import { describe, expect, it } from "vitest";
import { detectImageMime, validatePasswordChange } from "./settings-validation";

describe("detectImageMime", () => {
  it.each([
    ["image/png", [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
    ["image/jpeg", [0xff,0xd8,0xff,0xe0]],
    ["image/gif", [0x47,0x49,0x46,0x38,0x39,0x61]],
    ["image/webp", [0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]],
  ])("detects %s", (mime, bytes) => expect(detectImageMime(Uint8Array.from(bytes))).toBe(mime));

  it("rejects forged image bytes", () => {
    expect(detectImageMime(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("validatePasswordChange", () => {
  it("preserves intentional whitespace", () => {
    expect(validatePasswordChange(" old pass ", " new pass ", " new pass ")).toEqual({
      ok: true, currentPassword: " old pass ", newPassword: " new pass ",
    });
  });
  it("rejects mismatch", () => {
    expect(validatePasswordChange("current123", "newpass123", "different").ok).toBe(false);
  });
});
