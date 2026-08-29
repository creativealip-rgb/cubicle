
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function NewQuestionnairePage() {
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/app/questionnaires">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Semua Formulir", "All Forms")}
          </Link>
        </Button>
        <h1 className="app-page-title">
          {t("Formulir baru", "New Form")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            "Buat form. Kirim ke klien. Dapatkan brief yang terstruktur.",
            "Build a form. Send it to clients. Get structured briefs back.",
          )}
        </p>
      </div>
      <QuestionnaireBuilder
        workspaceId={workspaceId}
      />
    </div>
  );
}
