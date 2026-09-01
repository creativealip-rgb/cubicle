import { describe, expect, it } from "vitest";
import { canContinueFromRecovery, getWizardStep } from "./setup-wizard";

describe("MFA setup wizard", () => {
  it("defines method, authenticator, recovery, and completion states", () => {
    expect(getWizardStep("method")).toMatchObject({
      label: "Choose method",
      number: 1,
    });
    expect(getWizardStep("authenticator")).toMatchObject({
      label: "Set up authenticator",
      number: 2,
    });
    expect(getWizardStep("recovery")).toMatchObject({
      label: "Save recovery codes",
      number: 2,
    });
    expect(getWizardStep("complete")).toMatchObject({
      label: "Complete",
      number: 2,
    });
  });
  it("requires recovery codes and acknowledgment", () => {
    expect(canContinueFromRecovery([], true)).toBe(false);
    expect(canContinueFromRecovery(["abc"], false)).toBe(false);
    expect(canContinueFromRecovery(["abc"], true)).toBe(true);
  });
});
