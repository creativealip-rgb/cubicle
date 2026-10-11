import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
const tabs = source("src/components/settings/settings-tabs.tsx");
const settings = source("src/app/(app)/app/settings/page.tsx");
const calendar = source("src/app/(app)/app/calendar/page.tsx");
const onboarding = source("src/components/dashboard-onboarding.tsx");
const dashboard = source("src/app/(app)/app/dashboard/page.tsx");

describe("settings and onboarding source wiring", () => {
  it("keeps settings tab order and legacy aliases", () => {
    // Billing tab was removed from Settings (c4e558e3); Plan lives in the user menu.
    expect(tabs).toMatch(/const TAB_KEYS[\s\S]*?\[\s*"account",\s*"workspace",\s*"invoice",\s*"team",\s*"integrations",\s*\]/);
    expect(tabs).not.toContain('"billing"');
    expect(tabs).toContain('if (tab === "branding") return "workspace"');
  });

  it("keeps Google Calendar marked as soon", () => {
    expect(settings).toContain("Google Calendar");
    expect(settings).toContain("Soon");
  });

  it("keeps BookingSlug out of Settings and in Calendar", () => {
    expect(settings).not.toContain("BookingSlug");
    // Calendar owns the booking slug via the header widget.
    expect(calendar).toContain("BookingSlugHeaderWidget");
  });

  it("keeps onboarding copy and dashboard checklist steps exact", () => {
    expect(onboarding).toContain('"Langkah Awal Memulai", "Getting Started Checklist"');
    expect(onboarding).toContain('"Selesaikan langkah berikut untuk memaksimalkan workspace Cubiqlo kamu.",');
    expect(onboarding).toContain('"Complete these initial steps to get the most out of Cubiqlo.",');
    for (const href of ['"/app/clients"', '"/app/personal-site"', '"/app/personal"', '"/app/docs"']) {
      expect(dashboard).toContain(`href: ${href}`);
    }
  });

  it("renders pending checklist steps and dismisses when none remain", () => {
    expect(onboarding).toContain("pendingSteps = steps.filter((s) => !s.done)");
    expect(onboarding).toContain("pendingSteps.map((step)");
    // Dismiss/complete collapse is intentional; assert the guard exists.
    expect(onboarding).toMatch(/if \(dismissed.*pendingSteps\.length === 0\) return null/);
  });
});