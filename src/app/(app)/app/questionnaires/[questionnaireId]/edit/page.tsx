import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { db } from "@/db";
import { questionnaires, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import { safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";
import { notFound } from "next/navigation";

export default async function QuestionnaireEditPage({ params }: { params: Promise<{ questionnaireId: string }> }) {
  const { questionnaireId } = await params;
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/questionnaires");

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) notFound();

  const [workspace] = await db.select({
    name: workspaces.name,
    billingName: workspaces.billingName,
    logoUrl: workspaces.logoUrl,
  })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const fields = safeParseQuestionnaireSchema(q.schema);

  return (
    <QuestionnaireBuilder
      workspaceId={workspaceId}
      workspaceName={workspace?.billingName || workspace?.name}
      workspaceLogoUrl={workspace?.logoUrl}
      questionnaireId={q.id}
      initial={{
        name: q.name,
        slug: q.slug,
        description: q.description,
        expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
        maxResponses: q.maxResponses,
        requireAll: q.requireAll,
        themePreset: q.themePreset,
        cardRadius: q.cardRadius,
        thankYouMessage: q.thankYouMessage,
        redirectUrl: q.redirectUrl,
        formStatus: (q.formStatus as "active" | "disabled") || "active",
        schema: fields,
      }}
    />
  );
}
