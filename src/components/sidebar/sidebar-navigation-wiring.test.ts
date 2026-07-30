import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("keeps active route children inline without hover-driven layout shifts", () => {
    expect(source).toContain("groupActive && !collapsed");
    expect(source).toContain('className="ml-4 space-y-1 border-l border-slate-200 pl-2"');
    expect(source).not.toContain("groupOpen && !collapsed");
  });

  it("previews inactive group children in a delayed external flyout", () => {
    expect(source).toContain("scheduleFlyoutOpen(entry.id)");
    expect(source).toContain("scheduleFlyoutClose");
    expect(source).toContain("sidebar-flyout-");
    expect(source).toContain('className="fixed z-[60]');
  });

  it("shows a chevron on every desktop group", () => {
    expect(source).toContain("<ChevronRight");
  });

  it("keeps mobile groups as compact accordions", () => {
    expect(source).toContain('className="space-y-1 lg:hidden"');
    expect(source).toContain("setMobileGroup((current)");
  });

  it("closes mobile navigation after direct and child navigation", () => {
    expect(source).toContain("onClick={onNavigate}");
  });
});
