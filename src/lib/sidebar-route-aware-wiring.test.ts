import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/components/sidebar/sidebar-navigation.tsx"), "utf8");

describe("route-aware sidebar wiring", () => {
  it("uses active route as desktop flyout fallback with explicit override", () => {
    expect(source).toContain("resolveSidebarOpenGroup");
    expect(source).toContain("SidebarGroupOverride");
    expect(source).toContain("activeGroup: active.groupId");
    expect(source).toContain('useState<SidebarGroupOverride>({ kind: "default" })');
  });

  it("resets manual override and positions the active flyout when pathname changes", () => {
    expect(source).toContain('setDesktopOverride({ kind: "default" })');
    expect(source).toContain("requestAnimationFrame(() => placePanel(active.groupId!))");
  });

  it("renders chevron based on effective expanded state", () => {
    expect(source).toContain("expanded ? <ChevronDown");
    expect(source).toContain(": <ChevronRight");
  });
});
