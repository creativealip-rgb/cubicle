import { CanvasPageClient } from "@/components/site/canvas/canvas-page-client";
import {
  getPersonalSiteForCurrentOwner,
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
  const canEditSlug = await getPersonalSiteSlugEntitlement();
  return <CanvasPageClient
    initialSite={site}
    action={savePersonalSite}
    publicSiteBaseUrl={personalSitePublicBaseUrl()}
    previewUrl={personalSitePreviewUrl(site.slug)}
    canEditSlug={canEditSlug}
  />;
}
