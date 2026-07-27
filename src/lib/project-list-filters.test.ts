import { describe, expect, it } from "vitest";
import { buildProjectsHref, parseBillingType } from "./project-list-filters";

describe("project list billing type filter", () => {
  it("accepts project billing types and rejects unknown values", () => {
    expect(parseBillingType("project")).toBe("project");
    expect(parseBillingType("hours")).toBe("hours");
    expect(parseBillingType("package")).toBe("package");
    expect(parseBillingType("unknown")).toBeUndefined();
  });

  it("preserves status and client filters when selecting a billing type", () => {
    expect(buildProjectsHref({
      status: "draft",
      clientId: "client-1",
      billingType: "hours",
    })).toBe("/app/projects?status=draft&clientId=client-1&billingType=hours");
  });

  it("removes billingType when all project types are selected", () => {
    expect(buildProjectsHref({ status: "active" })).toBe("/app/projects");
  });
});
