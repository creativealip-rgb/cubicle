import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces, clients, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getWorkspace() {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws;
}

export default async function NewQuestionnairePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  await assertWorkspaceWritable(db, user.id, ws.id);

  const clientsList = await db.select({ id: clients.id, name: clients.name })
    .from(clients).where(eq(clients.workspaceId, ws.id));
  const projectsList = await db.select({ id: projects.id, name: projects.name })
    .from(projects).where(eq(projects.workspaceId, ws.id));

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
        <h1 className="text-2xl font-semibold tracking-tight">New questionnaire</h1>
        <p className="text-sm text-slate-500 mt-1">Build a form. Send to a client. Get back a structured brief.</p>
      </div>
      <QuestionnaireBuilder
        workspaceId={ws.id}
      />
    </div>
  );
}
