import { describe, expect, it } from "vitest";
import { resolveSidebarOpenGroup, type SidebarGroupOverride } from "@/lib/sidebar-open-group";

const none: SidebarGroupOverride = { kind: "default" };

describe("resolveSidebarOpenGroup", () => {
  it("uses active route group as default", () => {
    expect(resolveSidebarOpenGroup({ hovered: null, override: none, activeGroup: "work" })).toBe("work");
  });

  it("uses hover as temporary preview", () => {
    expect(resolveSidebarOpenGroup({ hovered: "finance", override: none, activeGroup: "work" })).toBe("finance");
  });

  it("uses manually opened group when not hovering", () => {
    expect(resolveSidebarOpenGroup({ hovered: null, override: { kind: "open", groupId: "personal" }, activeGroup: "work" })).toBe("personal");
  });

  it("allows active group to be closed manually", () => {
    expect(resolveSidebarOpenGroup({ hovered: null, override: { kind: "closed" }, activeGroup: "work" })).toBeNull();
  });
});
