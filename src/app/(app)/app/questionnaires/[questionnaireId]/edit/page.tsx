import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { db } from "@/db";
import { questionnaires } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import { safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function QuestionnaireEditPage({ params }: { params: Promise<{ questionnaireId: string }> }) {
  const { questionnaireId } = await params;
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) notFound();

  const fields = safeParseQuestionnaireSchema(q.schema);

  return (
    <QuestionnaireBuilder
      workspaceId={workspaceId}
      questionnaireId={q.id}
      initial={{
        name: q.name,
        description: q.description,
        schema: fields,
      }}
    />
  );
}
