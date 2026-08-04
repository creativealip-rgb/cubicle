"use client";

import { useRef, useCallback } from "react";
import { CanvasEditor } from "./canvas-editor";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import type { PersonalSiteActionState } from "@/lib/actions/personal-site";

type Props = {
  initialSite: PersonalSiteInput;
  action: (state: PersonalSiteActionState, formData: FormData) => Promise<PersonalSiteActionState>;
  publicSiteBaseUrl: string;
  previewUrl: string;
};

export function CanvasPageClient({ initialSite, action, publicSiteBaseUrl, previewUrl }: Props) {
  const actionRef = useRef(action);

  const handleSave = useCallback(async (site: PersonalSiteInput) => {
    const formData = new FormData();
    formData.set("site", JSON.stringify(site));
    formData.set("intent", site.published ? "publish" : "draft");
    const result = await actionRef.current({ status: "idle" }, formData);
    if (result.status === "error") {
      throw new Error(result.message);
    }
  }, []);

  return (
    <CanvasEditor
      key={initialSite.slug}
      initialSite={initialSite}
      previewUrl={previewUrl}
      publicSiteBaseUrl={publicSiteBaseUrl}
      onSave={handleSave}
    />
  );
}
