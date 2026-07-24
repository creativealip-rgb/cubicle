import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";

async function getWorkspace() {
  return getWorkspaceFullForCurrentUser();
}

export default async function NewQuestionnairePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  await assertWorkspaceWritable(db, user.id, ws.id);

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
      <div>
        <h1 className="app-page-title">Kuesioner Baru</h1>
        <p className="text-sm text-slate-500 mt-1">Buat form. Kirim ke klien. Dapatkan brief yang terstruktur.</p>
      </div>
      <QuestionnaireBuilder
        workspaceId={ws.id}
      />
    </div>
  );
}
