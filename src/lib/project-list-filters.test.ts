import { describe, expect, it } from "vitest";
import { buildProjectsHref, parseBillingType } from "./project-list-filters";

describe("project list billing type filter", () => {
  it("accepts canonical billing models and maps legacy query values", () => {
    expect(parseBillingType("project")).toBe("fixed_price");
    expect(parseBillingType("hours")).toBe("hourly");
    expect(parseBillingType("fixed_price")).toBe("fixed_price");
    expect(parseBillingType("hourly")).toBe("hourly");
    expect(parseBillingType("retainer")).toBe("retainer");
    expect(parseBillingType("package")).toBe("package");
    expect(parseBillingType("unknown")).toBeUndefined();
  });

  it("preserves status and client filters when selecting a billing type", () => {
    expect(buildProjectsHref({
      status: "on_hold",
      clientId: "client-1",
      billingType: "hourly",
    })).toBe("/app/projects?status=on_hold&clientId=client-1&billingType=hourly");
  });

  it("removes billingType when all project types are selected", () => {
    expect(buildProjectsHref({ status: "active" })).toBe("/app/projects");
  });
});
