import type { PlanTier } from "@/lib/plan";
import { normalizePersonalSiteSlug } from "./model";

export function canEditPersonalSiteSlug(plan: PlanTier): boolean {
  return plan === "solo" || plan === "team";
}

export function getEffectivePersonalSiteSlug(
  plan: PlanTier,
  workspaceSlug: string,
  customSlug: string | null | undefined,
): string {
  const workspace = normalizePersonalSiteSlug(workspaceSlug);
  if (!canEditPersonalSiteSlug(plan)) return workspace;

  const custom = normalizePersonalSiteSlug(customSlug ?? "");
  return custom || workspace;
}

export function matchesPersonalSiteSlug(
  plan: PlanTier,
  workspaceSlug: string,
  customSlug: string | null | undefined,
  requestSlug: string,
): boolean {
  return normalizePersonalSiteSlug(requestSlug) === getEffectivePersonalSiteSlug(plan, workspaceSlug, customSlug);
}

export function getPersonalSiteSlugCandidates(
  plan: PlanTier,
  workspaceSlug: string,
  customSlug: string | null | undefined,
): string[] {
  return [getEffectivePersonalSiteSlug(plan, workspaceSlug, customSlug)];
}

