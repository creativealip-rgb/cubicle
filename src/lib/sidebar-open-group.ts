import type { SidebarGroupId } from "@/lib/navigation/app-navigation";

export type SidebarGroupOverride =
  | { kind: "default" }
  | { kind: "open"; groupId: SidebarGroupId }
  | { kind: "closed" };

export function resolveSidebarOpenGroup({
  hovered,
  override,
  activeGroup,
}: {
  hovered: SidebarGroupId | null;
  override: SidebarGroupOverride;
  activeGroup: SidebarGroupId | null;
}): SidebarGroupId | null {
  if (hovered) return hovered;
  if (override.kind === "open") return override.groupId;
  if (override.kind === "closed") return null;
  return activeGroup;
}
