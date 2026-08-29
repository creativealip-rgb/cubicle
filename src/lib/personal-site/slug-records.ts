import { getEffectivePlan } from "@/lib/plan";
import { normalizePersonalSiteSlug } from "./model";
import { getEffectivePersonalSiteSlug } from "./slug-policy";

export type PersonalSiteSlugRecord = {
  id: string;
  workspaceId: string;
  slug: string;
  published: boolean;
  plan: string | null;
  planExpiresAt: Date | string | null;
  workspaceSlug: string;
};

export function getRecordEffectiveSlug(record: PersonalSiteSlugRecord): string {
  return getEffectivePersonalSiteSlug(
    getEffectivePlan(record.plan, record.planExpiresAt),
    record.workspaceSlug,
    record.slug,
  );
}

export function findPersonalSiteByEffectiveSlug(
  records: PersonalSiteSlugRecord[],
  requestSlug: string,
  options: { publishedOnly?: boolean; excludeSiteId?: string } = {},
): PersonalSiteSlugRecord | undefined {
  const clean = normalizePersonalSiteSlug(requestSlug);
  if (clean !== requestSlug) return undefined;
  return records.find((record) =>
    record.id !== options.excludeSiteId &&
    (!options.publishedOnly || record.published) &&
    getRecordEffectiveSlug(record) === clean
  );
}

export function hasEffectiveSlugCollision(
  records: PersonalSiteSlugRecord[],
  slug: string,
  excludeSiteId?: string,
): boolean {
  return Boolean(findPersonalSiteByEffectiveSlug(records, slug, { excludeSiteId }));
}
