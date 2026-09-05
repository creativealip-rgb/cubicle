import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("keeps active route children inline without hover-driven layout shifts", () => {
    expect(source).toContain("groupActive && !collapsed");
    expect(source).toMatch(/className="ml-[\d.]+ space-y-[\d.]+ border-l border-[^"]+ pl-2"/);
    expect(source).not.toContain("groupOpen && !collapsed");
  });

  it("previews inactive group children in a delayed external flyout", () => {
    expect(source).toContain("scheduleFlyoutOpen(entry.id)");
    expect(source).toContain("scheduleFlyoutClose");
    expect(source).toContain("sidebar-flyout-");
    expect(source).toContain('className="fixed z-[60]');
  });

  it("left-aligns desktop and mobile parent labels beside their icons", () => {
    expect(source.match(/<span className="flex-1 text-left[^"]*">\{t\(entry\.label\.id, entry\.label\.en\)\}<\/span>/g)).toHaveLength(2);
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
