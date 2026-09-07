import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  "src/app/(app)/app/clients/[clientId]/page.tsx",
  "utf8",
);
const nav = readFileSync("src/components/clients/client-tabs-nav.tsx", "utf8");

describe("client detail tabs", () => {
  it("keeps tabs in shared ClientTabsNav and updates query params without navigation", () => {
    // Tabs moved to shared client-tabs-nav; page renders it with initialTab
    expect(page).toContain("<ClientTabsNav");
    expect(page).toContain("initialTab={initialTab}");
    // Nav derives current tab from the query string, defaulting to initialTab
    expect(nav).toContain('const currentTab = searchParams.get("tab") || initialTab;');
    expect(nav).toContain('router.replace(`${pathname}?${params.toString()}`, { scroll: false });');
    // All five tab triggers present, overview first and portal last
    for (const tab of ["overview", "projects", "invoices", "calendar", "portal"]) {
      expect(nav).toContain(`value="${tab}"`);
    }
    expect(nav.indexOf('value="overview"')).toBeLessThan(nav.indexOf('value="projects"'));
    expect(nav.indexOf('value="portal"')).toBeGreaterThan(nav.indexOf('value="calendar"'));
    expect(nav).not.toContain("?tab=notes");
    expect(page).not.toContain("?tab=notes");
  });
});
