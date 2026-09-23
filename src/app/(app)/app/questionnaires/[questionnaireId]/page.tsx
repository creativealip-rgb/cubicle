import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { questionnaires, questionnaireResponses, clients, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SendQuestionnaireButton } from "@/components/questionnaires/send-questionnaire-button";
import { QuestionnaireResponsesTable } from "@/components/questionnaires/questionnaire-responses-table";
import { DeleteQuestionnaireButton } from "@/components/questionnaires/delete-questionnaire-button";
import Link from "next/link";
import { ArrowLeft, Edit, ExternalLink, Share2, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function QuestionnaireDetailPage({ params }: { params: Promise<{ questionnaireId: string }> }) {
  const { questionnaireId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";
  const lang = await getCurrentLang();
  const t = createT(lang);

  const [q] = await db
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) notFound();

  const fields = safeParseQuestionnaireSchema(q.schema);
  const responses = await db
    .select({
      id: questionnaireResponses.id,
      respondentName: questionnaireResponses.respondentName,
      respondentEmail: questionnaireResponses.respondentEmail,
      status: questionnaireResponses.status,
      answers: questionnaireResponses.answers,
      submittedAt: questionnaireResponses.submittedAt,
      createdAt: questionnaireResponses.createdAt,
      clientId: questionnaireResponses.clientId,
      clientName: clients.name,
      projectId: questionnaireResponses.projectId,
      projectName: projects.name,
    })
    .from(questionnaireResponses)
    .leftJoin(clients, eq(clients.id, questionnaireResponses.clientId))
    .leftJoin(projects, eq(projects.id, questionnaireResponses.projectId))
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId))
    .orderBy(desc(questionnaireResponses.createdAt));

  const clientsList = await db
    .select({ id: clients.id, name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  const projectsList = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  const submitted = responses.filter((r) => r.status === "submitted");
  const pending = responses.filter((r) => r.status === "pending");
  const publicShareUrl = `/intake/${q.id}`;

  return (
    <div className="min-w-0 space-y-4">
      {/* ─── Top Jotform Tables Header Bar ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/app/questionnaires"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Kembali ke Daftar Formulir"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground truncate">
              {q.name}
            </h1>
            <Badge variant="outline" className="text-[10px] font-semibold py-0 px-2 h-5 border-primary/30 bg-primary/5 text-primary">
              Jotform Tables
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground pl-6">
            <span>{fields.length} {t("kolom pertanyaan", "fields")}</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{submitted.length} {t("tanggapan masuk", "submitted")}</span>
            {pending.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600">{pending.length} {t("menunggu respon", "pending")}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5" asChild>
            <Link href={publicShareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka Form Publik</span>
            </Link>
          </Button>

          {canWrite && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5" asChild>
                <Link href={`/app/questionnaires/${q.id}/edit`}>
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Builder</span>
                </Link>
              </Button>
              <SendQuestionnaireButton
                questionnaireId={q.id}
                name={q.name}
                clients={clientsList}
                projects={projectsList}
              />
              <DeleteQuestionnaireButton questionnaireId={q.id} />
            </>
          )}
        </div>
      </div>

      {/* ─── Hero Spreadsheet Table (Jotform Tables View) ─── */}
      <div className="w-full">
        <QuestionnaireResponsesTable
          responses={responses}
          fields={fields}
          formName={q.name}
        />
      </div>
    </div>
  );
}