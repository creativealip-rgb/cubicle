import { describe, expect, it } from "vitest";
import { getPasskeyErrorCode } from "./passkey-error";
describe("passkey error copy", () => {
  it("maps browser cancellation and timeout without leaking WebAuthn internals", () => {
    expect(
      getPasskeyErrorCode(
        new Error(
          "The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/",
        ),
      ),
    ).toBe("cancelled");
  });
  it("maps unsupported browsers", () => {
    expect(getPasskeyErrorCode(new Error("WebAuthn is not supported"))).toBe(
      "unsupported",
    );
  });
  it("uses a safe generic fallback", () => {
    expect(getPasskeyErrorCode(new Error("internal secret detail"))).toBe(
      "failed",
    );
  });
});
