import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { questionnaires, questionnaireResponses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
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
import { Plus, ClipboardList } from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function QuestionnairesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

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

  // For each questionnaire, count submitted + pending responses
  const counts: Record<string, { submitted: number; pending: number }> = {};
  for (const q of rows) {
    const all = await db
      .select({ status: questionnaireResponses.status })
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, q.id));
    counts[q.id] = {
      submitted: all.filter(r => r.status === "submitted").length,
      pending: all.filter(r => r.status === "pending").length,
    };
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kuesioner</h1>
          <p className="text-sm text-slate-500 mt-1">Form intake untuk klien baru. Jawaban jadi brief proyek.</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/app/questionnaires/new">
              <Plus className="h-4 w-4 mr-1" />
              New questionnaire
            </Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">No questionnaires yet. Build one to gather client briefs.</p>
          {canWrite && (
            <Button asChild>
              <Link href="/app/questionnaires/new">
                <Plus className="h-4 w-4 mr-1" />
                Create your first questionnaire
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Updated</TableHead>
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
                      <Link href={`/app/questionnaires/${q.id}`} className="font-medium text-sm hover:underline">
                        {q.name}
                      </Link>
                      {q.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{q.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{fieldCount}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="default">{c.submitted}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.pending > 0 ? <Badge variant="secondary">{c.pending}</Badge> : <span className="text-slate-400">0</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(q.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/app/questionnaires/${q.id}`} className="text-sm text-indigo-600 hover:underline">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
