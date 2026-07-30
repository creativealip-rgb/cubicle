import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("renders every desktop group as a parent with route-active inline children", () => {
    expect(source).toContain("const groupActive = active.groupId === entry.id");
    expect(source).toContain("groupActive && !collapsed");
    expect(source).toContain("entry.children.map((item) => directLink(item))");
    expect(source).toContain('className="ml-4 space-y-1 border-l border-slate-200 pl-2"');
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
