import { describe, expect, it } from "vitest";
import { normalizeAnalyticsPath } from "./analytics";

describe("usage analytics privacy", () => {
  it("normalizes app routes and removes identifiers", () => {
    expect(normalizeAnalyticsPath("/app/projects/abc123?tab=tasks#x")).toBe("/app/projects/[id]");
    expect(normalizeAnalyticsPath("/app/clients/550e8400-e29b-41d4-a716-446655440000")).toBe("/app/clients/[id]");
  });
  it("rejects admin auth and token routes", () => {
    expect(normalizeAnalyticsPath("/admin/analytics")).toBeNull();
    expect(normalizeAnalyticsPath("/login")).toBeNull();
    expect(normalizeAnalyticsPath("/portal/abc/token-value")).toBeNull();
  });
});

describe("usage analytics wiring", () => {
  it("allows future usage events", async () => {
    const { ALLOWED_ANALYTICS_EVENTS } = await import("./analytics");
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("page_viewed");
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("feature_used");
  });

  it("wires usage payload and route-backed usage view", async () => {
    const { readFileSync } = await import("node:fs");
    const dashboard = readFileSync("src/lib/actions/admin/dashboard.ts", "utf8");
    const component = readFileSync("src/components/admin/growth-kpi-dashboard.tsx", "utf8");
    expect(dashboard).toContain("usagePages");
    expect(dashboard).toContain("usageFeatures");
    expect(component).toContain('"usage"');
    expect(component).toContain("Top pages");
  });
});