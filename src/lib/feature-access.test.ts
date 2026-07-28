import { describe, expect, it } from "vitest";
import { canAccessTemplatesPreview, normalizeEmail } from "./feature-access";

describe("template preview access", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  ALIP.QA@CUBIQLO.TEST ")).toBe("alip.qa@cubiqlo.test");
  });

  it("keeps permanent preview account available", () => {
    expect(canAccessTemplatesPreview("alipdevcom@gmail.com", "production")).toBe(true);
  });

  it("allows synthetic QA account only in isolated development", () => {
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", "development")).toBe(true);
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", "production")).toBe(false);
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", undefined)).toBe(false);
  });

  it("does not open preview for other development users", () => {
    expect(canAccessTemplatesPreview("member@cubiqlo.test", "development")).toBe(false);
  });
});
