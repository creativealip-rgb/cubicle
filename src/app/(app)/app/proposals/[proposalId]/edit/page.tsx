import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { saveProposalBlocks } from "@/lib/actions/proposals";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";
import { workspaces } from "@/db/schema";

export default async function ProposalEditPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [proposal] = await db.select({ id: proposals.id, clientName: proposals.clientName, clientEmail: proposals.clientEmail, companyName: proposals.companyName, validUntil: proposals.validUntil, contentBlocks: proposals.contentBlocks, contentRevision: proposals.contentRevision, status: proposals.status })
    .from(proposals).where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId))).limit(1);
  if (!proposal || proposal.status !== "draft") notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const blocks = normalizeDocumentBlocks(proposal.contentBlocks, "proposal");
  const placeholderValues = buildProposalPlaceholderValues({ clientName: proposal.clientName, clientEmail: proposal.clientEmail, companyName: proposal.companyName, validUntil: proposal.validUntil, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });
  async function saveBlocks(next: Parameters<typeof saveProposalBlocks>[1]["contentBlocks"], revision: number) {
    "use server";
    return saveProposalBlocks(proposalId, { contentBlocks: next, revision });
  }
  return <DocumentBlockEditor kind="proposal" workspaceId={workspaceId} initialBlocks={blocks.length ? blocks : defaultDocumentBlocks("proposal")} initialRevision={proposal.contentRevision} placeholderValues={placeholderValues} saveBlocks={saveBlocks} />;
}
