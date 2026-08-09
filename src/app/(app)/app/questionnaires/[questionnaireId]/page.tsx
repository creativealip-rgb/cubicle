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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendQuestionnaireButton } from "@/components/questionnaires/send-questionnaire-button";
import { ResponseViewer } from "@/components/questionnaires/response-viewer";
import Link from "next/link";
import { ArrowLeft, Edit, ClipboardList, Inbox } from "lucide-react";
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

  const [q] = await db.select().from(questionnaires)
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

  const clientsList = await db.select({ id: clients.id, name: clients.name })
    .from(clients).where(eq(clients.workspaceId, workspaceId));
  const projectsList = await db.select({ id: projects.id, name: projects.name })
    .from(projects).where(eq(projects.workspaceId, workspaceId));

  const submitted = responses.filter(r => r.status === "submitted");
  const pending = responses.filter(r => r.status === "pending");

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/app/questionnaires"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {t("Kembali ke Kuesioner", "Back to Questionnaires")}
          </Link>
          <h1 className="app-page-title mt-1">{q.name}</h1>
          {q.description && <p>{q.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {fields.length} {t("kolom", "fields")}
            </span>
            <span>•</span>
            <span>
              {submitted.length} {t("terkirim", "submitted")}
            </span>
            <span>•</span>
            <span>
              {pending.length} {t("menunggu", "pending")}
            </span>
          </div>
        </div>
        {canWrite && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/app/questionnaires/${q.id}/edit`}>
                <Edit className="h-4 w-4" />
                {t("Edit", "Edit")}
              </Link>
            </Button>
            <SendQuestionnaireButton
              questionnaireId={q.id}
              clients={clientsList}
              projects={projectsList}
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            {t("Pratinjau form", "Form preview")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f) => (
            <div key={f.id} className="border-l-2 border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.label}</span>
                {f.required && <Badge variant="destructive" className="h-4 text-[10px]">{t("wajib", "required")}</Badge>}
                <Badge variant="outline" className="h-4 text-[10px]">{f.type}</Badge>
              </div>
              {f.placeholder && <p className="mt-0.5 text-xs text-slate-500">&ldquo;{f.placeholder}&rdquo;</p>}
              {f.options && f.options.length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">{t("Opsi", "Options")}: {f.options.join(", ")}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Inbox className="h-5 w-5" />
          {t("Jawaban", "Responses")}
        </h2>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              {t(
                "Belum ada jawaban. Kirim kuesioner ke klien untuk mulai.",
                "No responses yet. Send the questionnaire to a client to get started.",
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {responses.map(r => (
              <ResponseViewer key={r.id} response={r} fields={fields} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
