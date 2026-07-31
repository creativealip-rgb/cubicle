
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";


export default async function NewQuestionnairePage() {
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/questionnaires">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="app-page-title">Kuesioner Baru</h1>
        <p className="text-sm text-slate-500 mt-1">Buat form. Kirim ke klien. Dapatkan brief yang terstruktur.</p>
      </div>
      <QuestionnaireBuilder
        workspaceId={workspaceId}
      />
    </div>
  );
}
