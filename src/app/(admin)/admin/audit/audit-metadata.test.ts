import { describe, expect, it } from "vitest";
import { summarizeAuditMetadata, humanizeAuditAction } from "./audit-metadata";

describe("admin audit metadata", () => {
  it("humanizes known actions and plan changes", () => {
    expect(humanizeAuditAction("user.plan_change")).toBe("Plan changed");
    expect(summarizeAuditMetadata({ from: "free", to: "pro", reason: "upgrade" })).toContain("free → pro");
  });
  it("fails safely on malformed metadata", () => {
    expect(summarizeAuditMetadata("not-json")).toBe("No additional details");
  });
});
