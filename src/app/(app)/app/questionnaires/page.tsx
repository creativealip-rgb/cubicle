import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { questionnaires, questionnaireResponses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionnairesListTable } from "@/components/questionnaires/questionnaires-list-table";
import { QuestionnaireCreateDialog } from "@/components/calendar/questionnaire-create-dialog";
import { EmptyState } from "@/components/empty-state";
import { Plus, ClipboardList, ChevronRight } from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function QuestionnairesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";
  const lang = await getCurrentLang();
  const t = createT(lang);

  const rows = await db
    .select({
      id: questionnaires.id,
      name: questionnaires.name,
      description: questionnaires.description,
      schema: questionnaires.schema,
      createdAt: questionnaires.createdAt,
      updatedAt: questionnaires.updatedAt,
    })
    .from(questionnaires)
    .where(eq(questionnaires.workspaceId, workspaceId))
    .orderBy(desc(questionnaires.createdAt));

  const counts: Record<string, { submitted: number; pending: number }> = {};
  for (const q of rows) {
    const all = await db
      .select({ status: questionnaireResponses.status })
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, q.id));
    counts[q.id] = {
      submitted: all.filter((r) => r.status === "submitted").length,
      pending: all.filter((r) => r.status === "pending").length,
    };
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">{t("Kuesioner", "Questionnaires")}</h1>
          <p>
            {t(
              "Form intake klien. Jawaban jadi brief proyek.",
              "Client intake forms. Answers become project briefs.",
            )}
          </p>
        </div>
        {canWrite && rows.length > 0 && (
          <div className="app-page-actions">
            <QuestionnaireCreateDialog
              trigger={
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t("Kuesioner baru", "New questionnaire")}
                </Button>
              }
            />
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("Belum ada kuesioner", "No questionnaires yet")}
          description={t(
            "Buat satu untuk kumpulkan brief dari klien.",
            "Create one to collect briefs from clients.",
          )}
          actionNode={
            canWrite ? (
              <QuestionnaireCreateDialog
                trigger={
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("Kuesioner baru", "New questionnaire")}
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((q) => {
              const fieldCount = Array.isArray(q.schema) ? (q.schema as unknown[]).length : 0;
              const c = counts[q.id] || { submitted: 0, pending: 0 };
              return (
                <Link
                  key={q.id}
                  href={`/app/questionnaires/${q.id}`}
                  className="block rounded-lg border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{q.name}</p>
                      {q.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{q.description}</p>
                      )}
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <Badge variant="outline">{fieldCount} {t("kolom", "fields")}</Badge>
                    <Badge variant="default">
                      {c.submitted} {t("terkirim", "submitted")}
                    </Badge>
                    {c.pending > 0 ? (
                      <Badge variant="secondary">
                        {c.pending} {t("menunggu", "pending")}
                      </Badge>
                    ) : null}
                    <span className="text-slate-400">
                      {new Date(q.updatedAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <QuestionnairesListTable
            rows={rows.map((q) => {
              const fieldCount = Array.isArray(q.schema) ? (q.schema as unknown[]).length : 0;
              const c = counts[q.id] || { submitted: 0, pending: 0 };
              return {
                id: q.id,
                name: q.name,
                description: q.description,
                fieldCount,
                submitted: c.submitted,
                pending: c.pending,
                updatedAt: q.updatedAt,
              };
            })}
          />
        </>
      )}
    </div>
  );
}
