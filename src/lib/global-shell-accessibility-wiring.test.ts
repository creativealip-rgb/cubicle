import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("global app shell accessibility", () => {
  it("labels both global search inputs", () => {
    const topbar = read("src/components/app-topbar.tsx");
    expect(topbar.match(/aria-label=\{t\("Cari", "Search"\)\}/g)).toHaveLength(3);
  });

  it("keeps global shell icon controls at least 44px", () => {
    const topbar = read("src/components/app-topbar.tsx");
    const sidebar = read("src/components/app-sidebar.tsx");
    expect(topbar).toContain('className="h-11 w-11 shrink-0 lg:hidden"');
    expect(topbar).toContain('className="absolute right-0 h-11 w-11"');
    // Mobile close button stays a 44px touch target; the desktop-only collapse
    // chevron is intentionally compact (h-6 w-6) as a mouse-driven control.
    expect(sidebar).toContain("h-11 w-11 text-sidebar-foreground");
  });

  it("keeps language controls and onboarding dismiss touch-friendly", () => {
    const sidebar = read("src/components/app-sidebar.tsx");
    const onboarding = read("src/components/dashboard-onboarding.tsx");
    expect(sidebar).toContain("min-h-11 min-w-11");
    expect(onboarding).toContain("min-h-11 min-w-11");
  });
});
