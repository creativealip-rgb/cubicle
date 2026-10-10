import { CanvasPageClient } from "@/components/site/canvas/canvas-page-client";
import {
  getPersonalSiteForCurrentOwner,
  getPersonalSiteRevisionForCurrentOwner,
  getPersonalSiteSlugEntitlement,
  getSuggestedPersonalSiteDefaults,
  savePersonalSite,
} from "@/lib/actions/personal-site";
import { personalSitePreviewUrl, personalSitePublicBaseUrl } from "@/lib/personal-site/urls";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";

export const dynamic = "force-dynamic";

export default async function PersonalSiteBuilderPage() {
  await requireWorkspaceOwnerOrRedirect();
  const site = await getPersonalSiteForCurrentOwner() ?? await getSuggestedPersonalSiteDefaults();
  // Revision token travels as its own prop: the storage contract (PersonalSiteInput)
  // intentionally stays unchanged.
  const initialRevision = await getPersonalSiteRevisionForCurrentOwner();
  const canEditSlug = await getPersonalSiteSlugEntitlement();
  return <CanvasPageClient
    initialSite={site}
    initialRevision={initialRevision}
    action={savePersonalSite}
    publicSiteBaseUrl={personalSitePublicBaseUrl()}
    previewUrl={personalSitePreviewUrl(site.slug)}
    canEditSlug={canEditSlug}
  />;
}
