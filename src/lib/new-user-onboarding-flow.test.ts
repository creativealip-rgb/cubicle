import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");
const flow = readFileSync("src/components/onboarding/onboarding-flow.tsx", "utf8");
const modal = readFileSync("src/components/first-workspace-modal.tsx", "utf8");
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
    for (const source of [flow, modal]) {
      expect(source).toContain('type PlanChoice = "solo" | "team" | "enterprise"');
      expect(source).toContain('type SourceChoice = "instagram" | "google" | "friend" | "tiktok" | "other"');
      expect(source).toContain("Tau Cubiqlo dari mana?");
      expect(source).toContain('/app/settings?tab=account');
      expect(source).not.toContain("router.push(\"/app/dashboard\")");
      expect(source).not.toContain("Ke Dashboard");
    }
  });

  it("persists plan and source in onboarding activity metadata", () => {
    expect(action).toContain('z.enum(["solo", "team", "enterprise"])');
    expect(action).toContain('z.enum(["instagram", "google", "friend", "tiktok", "other"])');
    expect(action).toContain("plan: parsed.plan");
    expect(action).toContain("source: parsed.source");
  });
});
