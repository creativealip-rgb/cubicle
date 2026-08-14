import { describe, expect, it } from "vitest";
import { billingTypeHint, billingTypeLabel, canAccessTemplatesPreview, normalizeEmail } from "./feature-access";

describe("template preview access", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  ALIP.QA@CUBIQLO.TEST ")).toBe("alip.qa@cubiqlo.test");
  });

  it("keeps permanent preview account available", () => {
    expect(canAccessTemplatesPreview("alipdevcom@gmail.com", "production")).toBe(true);
  });

  it("opens Template Center regardless of environment", () => {
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", "development")).toBe(true);
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", "production")).toBe(true);
    expect(canAccessTemplatesPreview("alip.qa@cubiqlo.test", undefined)).toBe(true);
  });

  it("opens Template Center for every authenticated owner", () => {
    expect(canAccessTemplatesPreview("member@cubiqlo.test", "production")).toBe(true);
    expect(canAccessTemplatesPreview("member@cubiqlo.test", undefined)).toBe(true);
  });
});

describe("billing type display", () => {
  it("shows every current billing model without falling back to Fixed Price", () => {
    expect(billingTypeLabel("fixed_price", "id")).toBe("Fixed Price");
    expect(billingTypeLabel("hourly", "id")).toBe("Per Jam");
    expect(billingTypeLabel("retainer", "id")).toBe("Retainer");
    expect(billingTypeLabel("legacy_package", "id")).toBe("Per Paket");
  });

  it("keeps legacy billing types compatible", () => {
    expect(billingTypeLabel("project", "id")).toBe("Fixed Price");
    expect(billingTypeLabel("hours", "id")).toBe("Per Jam");
    expect(billingTypeLabel("package", "id")).toBe("Per Paket");
  });

  it("uses matching hints for hourly and retainer projects", () => {
    expect(billingTypeHint("hourly", "id")).toContain("jam kerja");
    expect(billingTypeHint("retainer", "id")).toContain("retainer");
  });
});
