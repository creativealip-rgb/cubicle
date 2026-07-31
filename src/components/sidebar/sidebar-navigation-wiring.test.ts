import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("renders the Work group inline on desktop without a covering flyout", () => {
    expect(source).toContain('entry.id === "work"');
    expect(source).toContain('aria-label={t("Pekerjaan", "Work")}');
    expect(source).toContain("entry.children.map((item) => directLink(item, collapsed))");
    expect(source).toContain('openEntry?.id !== "work"');
  });

  it("keeps other desktop groups available through flyouts", () => {
    expect(source).toContain("onClick={() => togglePinned(entry.id)}");
    expect(source).toContain('document.addEventListener("pointerdown", outside)');
    expect(source).toContain('event.key === "Escape"');
  });

  it("keeps mobile groups as compact accordions", () => {
    expect(source).toContain('className="space-y-1 lg:hidden"');
    expect(source).toContain("setMobileGroup((current)");
  });

  it("closes mobile navigation after direct and child navigation", () => {
    expect(source).toContain("onClick={onNavigate}");
  });
});
