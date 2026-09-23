
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function NewQuestionnairePage() {
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");

  return (
    <QuestionnaireBuilder
      workspaceId={workspaceId}
    />
  );
}
