import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";
import { saveProposalBlocks } from "@/lib/actions/proposals";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function ProposalEditPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  if (!isUuid(proposalId)) notFound();
  const workspaceId = await getWorkspaceForCurrentUser();
  const [proposal] = await db.select({
    id: proposals.id,
    clientName: proposals.clientName,
    clientEmail: proposals.clientEmail,
    companyName: proposals.companyName,
    proposalNumber: proposals.proposalNumber,
    validUntil: proposals.validUntil,
    subtotal: proposals.subtotal,
    tax: proposals.tax,
    total: proposals.total,
    downPaymentPercent: proposals.downPaymentPercent,
    contentBlocks: proposals.contentBlocks,
    contentRevision: proposals.contentRevision,
    status: proposals.status,
  })
    .from(proposals).where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId))).limit(1);
  if (!proposal || proposal.status !== "draft") notFound();
  const blocks = normalizeDocumentBlocks(proposal.contentBlocks, "proposal");
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const downPaymentAmount = Number(proposal.total) * Number(proposal.downPaymentPercent) / 100;
  const placeholderValues = buildProposalPlaceholderValues({
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    companyName: proposal.companyName,
    proposalNumber: proposal.proposalNumber,
    validUntil: proposal.validUntil,
    workspaceName: workspace?.name,
    workspaceAddress: workspace?.billingAddress,
    subtotal: Number(proposal.subtotal),
    tax: Number(proposal.tax),
    total: Number(proposal.total),
    downPaymentAmount: Number.isFinite(downPaymentAmount) ? downPaymentAmount : 0,
  });
  async function saveBlocks(next: Parameters<typeof saveProposalBlocks>[1]["contentBlocks"], revision: number) {
    "use server";
    return saveProposalBlocks(proposalId, { contentBlocks: next, revision });
  }
  return <DocumentBlockEditor kind="proposal" workspaceId={workspaceId} initialBlocks={blocks.length ? blocks : defaultDocumentBlocks("proposal")} initialRevision={proposal.contentRevision} backHref={`/app/proposals/${proposalId}`} placeholderValues={placeholderValues} saveBlocks={saveBlocks} />;
}
