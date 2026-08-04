import { CanvasPageClient } from "@/components/site/canvas/canvas-page-client";
import {
  getPersonalSiteForCurrentOwner,
  getSuggestedPersonalSiteDefaults,
  savePersonalSite,
} from "@/lib/actions/personal-site";
import { personalSitePreviewUrl, personalSitePublicBaseUrl } from "@/lib/personal-site/urls";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";

export const dynamic = "force-dynamic";

export default async function PersonalSiteBuilderPage() {
  await requireWorkspaceOwnerOrRedirect();
  const site = await getPersonalSiteForCurrentOwner() ?? await getSuggestedPersonalSiteDefaults();
  return <CanvasPageClient
    initialSite={site}
    action={savePersonalSite}
    publicSiteBaseUrl={personalSitePublicBaseUrl()}
    previewUrl={personalSitePreviewUrl()}
  />;
}
