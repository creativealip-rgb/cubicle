import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sanitizeAnalyticsMetadata, ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics";

describe("Phase 2 analytics contract", () => {
  it("allows only bounded non-PII metadata and allowlisted events", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("landing_viewed");
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("signup_started");
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("signup_completed");
    expect(sanitizeAnalyticsMetadata({ email: "x@y.z", password: "secret", referral_id: "abc", content: "x" })).toEqual({ content: "x" });
  });
  it("defines additive analytics tables and constraints", () => {
    const sql = readFileSync(join(process.cwd(), "drizzle/0102_analytics_attribution_entitlement_marketing_spend.sql"), "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS analytics_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS subscription_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS marketing_spend");
    expect(sql).toContain("CHECK (event_name IN");
    expect(sql).toContain("UNIQUE (provider_order_id, event_type)");
  });
});

describe("analytics attribution", () => {
  it("does not classify unknown attribution as organic", async () => {
    const { classifyAttribution } = await import("@/lib/analytics");
    expect(classifyAttribution({})).toBe("unknown");
    expect(classifyAttribution({ source: "google", medium: "organic" })).toBe("organic");
    expect(classifyAttribution({ referralId: "r1" })).toBe("referral");
  });
});

it("wires landing and signup event API", () => {
  const src = readFileSync(join(process.cwd(), "src/app/api/analytics/events/route.ts"), "utf8");
  expect(src).toContain("enforceServerActionRateLimit");
  expect(src).toContain("analyticsEvents");
});

it("wires subscription lifecycle events transactionally", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/pakasir-sync.ts"), "utf8");
  expect(src).toContain("subscriptionEvents");
  expect(src).toContain("from_plan");
});
 it("wires expiry lifecycle events transactionally", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/subscription.ts"), "utf8");
  expect(src).toContain("subscriptionEvents");
  expect(src).toContain("db.transaction");
});

describe("admin marketing spend", () => {
  it("exposes authenticated spend actions", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/actions/admin/marketing-spend.ts"), "utf8");
    expect(src).toContain("requireAdmin");
    expect(src).toContain("marketingSpend");
    expect(src).toContain("audit");
  });
});

describe("dashboard phase2", () => {
  it("queries analytics events and spend", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/actions/admin/dashboard.ts"), "utf8");
    expect(src).toContain("analytics_events");
    expect(src).toContain("marketing_spend");
    expect(src).toContain("signupStarts");
  });
});

