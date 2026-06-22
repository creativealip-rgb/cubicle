import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { questionnaires, questionnaireResponses, clients, projects, workspaces } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendQuestionnaireButton } from "@/components/questionnaires/send-questionnaire-button";
import { ResponseViewer } from "@/components/questionnaires/response-viewer";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Inbox } from "lucide-react";
import { notFound } from "next/navigation";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

type Field = {
  id: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "email" | "url";
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export default async function QuestionnaireDetailPage({ params }: { params: Promise<{ questionnaireId: string }> }) {
  const { questionnaireId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) notFound();

  const fields = (q.schema as Field[]) || [];
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
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/questionnaires">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{q.name}</h1>
          {q.description && (
            <p className="text-sm text-slate-500 mt-1">{q.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>{fields.length} fields</span>
            <span>•</span>
            <span>{submitted.length} submitted</span>
            <span>•</span>
            <span>{pending.length} pending</span>
          </div>
        </div>
        {canWrite && (
          <SendQuestionnaireButton
            questionnaireId={q.id}
            clients={clientsList}
            projects={projectsList}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Form preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f) => (
            <div key={f.id} className="border-l-2 border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.label}</span>
                {f.required && <Badge variant="destructive" className="text-[10px] h-4">required</Badge>}
                <Badge variant="outline" className="text-[10px] h-4">{f.type}</Badge>
              </div>
              {f.placeholder && <p className="text-xs text-slate-500 mt-0.5">&ldquo;{f.placeholder}&rdquo;</p>}
              {f.options && f.options.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Options: {f.options.join(", ")}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Responses
        </h2>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No responses yet. Send the questionnaire to a client to get started.
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
