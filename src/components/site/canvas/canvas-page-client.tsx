"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import type { PersonalSiteActionState } from "@/lib/actions/personal-site";
import { readPublicationIntent } from "@/lib/personal-site/publication-intent";
import { AutosaveSaveError } from "@/lib/use-retrying-autosave";
import { useT } from "@/lib/i18n-client";

function EditorLoading() {
  const { t } = useT();
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">{t("Memuat Editor Landing Page...", "Loading Landing Page Editor...")}</span>
      </div>
    </div>
  );
}

const CanvasEditor = dynamic(
  () => import("./canvas-editor").then((mod) => mod.CanvasEditor),
  {
    loading: () => <EditorLoading />,
    ssr: false,
  },
);

type Props = {
  initialSite: PersonalSiteInput;
  action: (state: PersonalSiteActionState, formData: FormData) => Promise<PersonalSiteActionState>;
  publicSiteBaseUrl: string;
  previewUrl: string;
  canEditSlug: boolean;
};

export function CanvasPageClient({ initialSite, action, publicSiteBaseUrl, previewUrl, canEditSlug }: Props) {
  const actionRef = useRef(action);

  const handleSave = useCallback(async (site: PersonalSiteInput) => {
    const formData = new FormData();
    // Explicit toggles carry a non-enumerable marker; plain autosave sends
    // "save" so the server preserves the stored publication state.
    const intent = readPublicationIntent(site) ?? "save";
    formData.set("site", JSON.stringify(site));
    formData.set("intent", intent);
    const result = await actionRef.current({ status: "idle" }, formData);
    if (result.status === "error") {
      if (result.fieldErrors?.slug?.length) throw new Error("PERSONAL_SITE_SLUG_TAKEN");
      // Structured field paths travel with the error so the editor can jump to
      // the offending section/property. Validation failures are terminal.
      const issuePaths = result.issuePaths ?? [];
      const fieldPaths = Object.keys(result.fieldErrors ?? {}).map((key) => [key]);
      const terminal = issuePaths.length > 0 || fieldPaths.length > 0;
      throw new AutosaveSaveError(result.message ?? "", {
        issuePaths: issuePaths.length > 0 ? issuePaths : fieldPaths,
        retryable: !terminal,
      });
    }
  }, []);

  return (
    <CanvasEditor
      key={initialSite.slug}
      initialSite={initialSite}
      previewUrl={previewUrl}
      publicSiteBaseUrl={publicSiteBaseUrl}
      onSave={handleSave}
      canEditSlug={canEditSlug}
    />
  );
}
