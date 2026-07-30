import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("renders desktop groups as interactive inline accordions", () => {
    expect(source).toContain("resolveSidebarOpenGroup");
    expect(source).toContain("onMouseEnter={() => setHoveredGroup(entry.id)}");
    expect(source).toContain("onFocus={() => setHoveredGroup(entry.id)}");
    expect(source).toContain("onClick={() => toggleDesktopGroup(entry.id)}");
    expect(source).toContain("aria-expanded={groupOpen}");
    expect(source).toContain("groupOpen && !collapsed");
    expect(source).toContain("entry.children.map((item) => directLink(item))");
    expect(source).toContain('className="ml-4 space-y-1 border-l border-slate-200 pl-2"');
  });

  it("shows a rotating chevron on every expanded desktop group", () => {
    expect(source).toContain("<ChevronRight");
    expect(source).toContain('groupOpen && "rotate-90"');
  });

  it("does not render covering desktop flyouts", () => {
    expect(source).not.toContain("sidebar-flyout-");
    expect(source).not.toContain('className="fixed z-[60]');
    expect(source).not.toContain("scheduleOpen(entry.id)");
  });

  it("keeps mobile groups as compact accordions", () => {
    expect(source).toContain('className="space-y-1 lg:hidden"');
    expect(source).toContain("setMobileGroup((current)");
  });

  it("closes mobile navigation after direct and child navigation", () => {
    expect(source).toContain("onClick={onNavigate}");
  });
});
