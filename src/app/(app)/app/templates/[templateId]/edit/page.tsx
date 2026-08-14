import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contractTemplates } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { TemplateBlocksEditor } from "@/components/templates/template-blocks-editor";

export default async function EditContractTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [template] = await db
    .select({ id: contractTemplates.id, name: contractTemplates.name, isDefault: contractTemplates.isDefault, contentBlocks: contractTemplates.contentBlocks })
    .from(contractTemplates)
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)))
    .limit(1);
  if (!template) notFound();

  return (
    <TemplateBlocksEditor
      kind="contract"
      workspaceId={workspaceId}
      template={template}
    />
  );
}
