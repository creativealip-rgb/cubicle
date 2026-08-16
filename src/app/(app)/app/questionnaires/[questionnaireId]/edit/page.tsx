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
  const lang = await getCurrentLang();
  const t = createT(lang);

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) notFound();

  const fields = safeParseQuestionnaireSchema(q.schema);

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={`/app/questionnaires/${q.id}`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Kembali ke kuesioner", "Back to questionnaire")}
          </Link>
        </Button>
        <h1 className="app-page-title">
          {t("Edit kuesioner", "Edit questionnaire")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            "Ubah nama, deskripsi, atau kolom form. Jawaban yang sudah masuk tetap tersimpan.",
            "Update the name, description, or fields. Existing responses stay saved.",
          )}
        </p>
      </div>
      <QuestionnaireBuilder
        workspaceId={workspaceId}
        questionnaireId={q.id}
        initial={{
          name: q.name,
          description: q.description,
          schema: fields,
        }}
      />
    </div>
  );
}
