import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposalTemplates } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { TemplateBlocksEditor } from "@/components/templates/template-blocks-editor";

export default async function EditProposalTemplatePage({
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
    .select({ id: proposalTemplates.id, name: proposalTemplates.name, isDefault: proposalTemplates.isDefault, contentBlocks: proposalTemplates.contentBlocks })
    .from(proposalTemplates)
    .where(and(eq(proposalTemplates.id, templateId), eq(proposalTemplates.workspaceId, workspaceId)))
    .limit(1);
  if (!template) notFound();

  return (
    <TemplateBlocksEditor
      kind="proposal"
      workspaceId={workspaceId}
      template={template}
    />
  );
}
