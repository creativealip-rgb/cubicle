import { getWorkspaceForCurrentUser, getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contractTemplates, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { ContractTemplateBuilder } from "@/components/contracts/contract-template-builder";

export default async function ContractTemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, await getWorkspaceForCurrentUser())).limit(1);
  if (!ws) throw new Error("Workspace not found");
  await assertWorkspaceMember(db, user.id, ws.id);
  await assertWorkspaceWritable(db, user.id, ws.id);

  const [template] = await db
    .select()
    .from(contractTemplates)
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, ws.id)))
    .limit(1);

  if (!template) notFound();

  return (
    <ContractTemplateBuilder
      workspaceId={ws.id}
      template={{
        id: template.id,
        name: template.name,
        body: template.body,
        isDefault: template.isDefault,
      }}
    />
  );
}
