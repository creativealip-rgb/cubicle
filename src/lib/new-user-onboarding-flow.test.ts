import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");
const flow = readFileSync("src/components/onboarding/onboarding-flow.tsx", "utf8");
const action = readFileSync("src/lib/actions/onboarding.ts", "utf8");
const verifyEmail = readFileSync("src/components/auth/verify-email-content.tsx", "utf8");
const verifyResult = readFileSync("src/components/auth/verify-email-result.tsx", "utf8");

describe("new user onboarding flow", () => {
  it("renders onboarding outside app shell", () => {
    expect(onboardingPage).toContain('"@/components/onboarding/onboarding-flow"');
    expect(onboardingPage).toContain("auth.api.getSession");
    expect(onboardingPage).not.toContain("AppShell");
    expect(flow).toContain("min-h-screen");
  });

  it("routes email verification users into onboarding before dashboard", () => {
    expect(verifyEmail).toContain('callbackURL: "/onboarding"');
    expect(verifyResult).toContain('router.push("/onboarding")');
    expect(verifyResult).not.toContain("Masuk ke Dashboard");
  });

  it("uses requested onboarding steps and sends users to account settings", () => {
    expect(flow).toContain('type PlanChoice = "solo" | "team" | "enterprise"');
    expect(flow).toContain('type SourceChoice = "instagram" | "google" | "friend" | "tiktok" | "other"');
    expect(flow).toContain("Dari Mana Kamu Tau Cubiqlo?");
    expect(flow).toContain('/app/settings?tab=account');
    expect(flow).not.toContain("router.push(\"/app/dashboard\")");
    expect(flow).toContain("sourceOther");
    expect(flow).toContain("Lainnya...");
  });

  it("persists plan and source in onboarding activity metadata", () => {
    expect(action).toContain('z.enum(["solo", "team", "enterprise"])');
    expect(action).toContain('z.enum(["instagram", "google", "friend", "tiktok", "other"])');
    expect(action).toContain("sourceOther");
    expect(action).toContain("plan: parsed.plan");
    expect(action).toContain("source: parsed.source");
  });
});
