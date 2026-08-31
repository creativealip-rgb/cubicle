import { describe, expect, it } from "vitest";
import { shouldRequireMfaSetup } from "./enforcement";

describe("MFA enforcement", () => {
  it("stays disabled until feature flag is enabled", () => {
    expect(shouldRequireMfaSetup({ route: "/app/dashboard", enrolled: false, isNewUser: true })).toBe(false);
  });

  it("does not require setup for an enrolled user", () => {
    expect(shouldRequireMfaSetup({ route: "/app/dashboard", enrolled: true, isNewUser: false })).toBe(false);
  });
});
