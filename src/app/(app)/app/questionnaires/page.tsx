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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Kuesioner", "Questionnaires")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              "Form intake klien. Jawaban jadi brief proyek.",
              "Client intake forms. Answers become project briefs.",
            )}
          </p>
        </div>
        {canWrite && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/questionnaires/new">
              <Plus className="mr-1 h-4 w-4" />
              {t("Kuesioner baru", "New questionnaire")}
            </Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center sm:p-12">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="mb-4 text-sm text-slate-500">
            {t(
              "Belum ada kuesioner. Buat satu untuk kumpulkan brief dari klien.",
              "No questionnaires yet. Create one to collect briefs from clients.",
            )}
          </p>
          {canWrite && (
            <Button asChild>
              <Link href="/app/questionnaires/new">
                <Plus className="mr-1 h-4 w-4" />
                {t("Buat kuesioner pertama", "Create first questionnaire")}
              </Link>
            </Button>
          )}
        </div>
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
                  className="block rounded-2xl border bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow"
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

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Nama", "Name")}</TableHead>
                  <TableHead>{t("Kolom", "Fields")}</TableHead>
                  <TableHead>{t("Terkirim", "Submitted")}</TableHead>
                  <TableHead>{t("Menunggu", "Pending")}</TableHead>
                  <TableHead>{t("Diperbarui", "Updated")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((q) => {
                  const fieldCount = Array.isArray(q.schema) ? (q.schema as unknown[]).length : 0;
                  const c = counts[q.id] || { submitted: 0, pending: 0 };
                  return (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Link
                          href={`/app/questionnaires/${q.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {q.name}
                        </Link>
                        {q.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{q.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{fieldCount}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="default">{c.submitted}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.pending > 0 ? (
                          <Badge variant="secondary">{c.pending}</Badge>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(q.updatedAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/app/questionnaires/${q.id}`}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          {t("Buka", "Open")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
