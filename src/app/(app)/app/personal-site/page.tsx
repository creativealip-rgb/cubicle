import { BuilderClient } from "@/components/site/builder-client";
import {
  getPersonalSiteForCurrentOwner,
  getSuggestedPersonalSiteDefaults,
  savePersonalSite,
} from "@/lib/actions/personal-site";
import { personalSitePreviewUrl, personalSitePublicBaseUrl } from "@/lib/personal-site/urls";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";

export default async function PersonalSiteBuilderPage() {
  await requireWorkspaceOwnerOrRedirect();
  const site = await getPersonalSiteForCurrentOwner() ?? await getSuggestedPersonalSiteDefaults();
  return <BuilderClient
    initialSite={site}
    action={savePersonalSite}
    publicSiteBaseUrl={personalSitePublicBaseUrl()}
    previewUrl={personalSitePreviewUrl()}
  />;
}
