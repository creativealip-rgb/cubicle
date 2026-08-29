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
    expect(tabs).toMatch(/const TAB_KEYS[\s\S]*?\[\s*"workspace",\s*"invoice",\s*"team",\s*"account",\s*"integrations",\s*"billing",\s*\]/);
    expect(tabs).toContain('if (tab === "branding") return "workspace"');
    expect(tabs).toContain('if (tab === "more") return "billing"');
  });

  it("keeps BookingSlug out of Settings and in Calendar", () => {
    expect(settings).not.toContain("BookingSlug");
    expect(calendar).toContain("BookingSlugForm");
  });

  it("keeps onboarding copy and Settings links exact", () => {
    expect(onboarding).toContain('"Mulai dari Pengaturan", "Start from Settings"');
    expect(onboarding).toContain('"Lengkapi workspace dan pengaturan invoice sebelum membuat proyek pertama.",');
    expect(onboarding).toContain('"Set up your workspace and invoice defaults before creating your first project.",');
    expect(dashboard).toContain('href: "/app/settings?tab=workspace"');
    expect(dashboard).toContain('href: "/app/settings?tab=invoice"');
  });

  it("renders completed onboarding steps instead of returning null", () => {
    expect(onboarding).not.toContain("if (allDone) return null");
    expect(onboarding).toContain("pendingSteps.length > 0 ? pendingSteps.slice(0, 3) : steps");
  });
});