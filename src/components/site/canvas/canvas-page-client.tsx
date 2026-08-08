"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import type { PersonalSiteActionState } from "@/lib/actions/personal-site";

const CanvasEditor = dynamic(
  () => import("./canvas-editor").then((mod) => mod.CanvasEditor),
  {
    loading: () => (
      <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat Editor Landing Page...</span>
        </div>
      </div>
    ),
    ssr: false,
  },
);

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
