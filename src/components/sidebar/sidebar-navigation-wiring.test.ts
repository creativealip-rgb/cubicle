import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/sidebar/sidebar-navigation.tsx", "utf8");

describe("sidebar navigation interaction wiring", () => {
  it("uses delayed hover open and close", () => {
    expect(source).toContain("const OPEN_DELAY_MS = 150");
    expect(source).toContain("const CLOSE_DELAY_MS = 300");
    expect(source).toContain("setTimeout(() => { placePanel(id); setHovered(id); }, OPEN_DELAY_MS)");
    expect(source).toContain("setTimeout(() => setHovered(null), CLOSE_DELAY_MS)");
  });

  it("supports click pin, outside click, Escape, and directional keyboard navigation", () => {
    expect(source).toContain("onClick={() => togglePinned(entry.id)}");
    expect(source).toContain('document.addEventListener("pointerdown", outside)');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === "ArrowDown"');
    expect(source).toContain('event.key === "ArrowUp"');
    expect(source).toContain('event.key === "ArrowLeft"');
  });

  it("renders desktop flyout and mobile accordion from the same entries", () => {
    expect(source).toContain('className="hidden space-y-1 lg:block"');
    expect(source).toContain('className="space-y-1 lg:hidden"');
    expect(source).toContain("entries.map((entry)");
    expect(source).toContain("setMobileGroup((current)");
  });

  it("closes mobile navigation after direct and child navigation", () => {
    expect(source).toContain("onClick={onNavigate}");
  });
});
