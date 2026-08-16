import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";
import { ProposalPublicView } from "@/components/proposals/proposal-public-view";
import type { ProposalLineItem } from "@/components/proposals/proposal-public-view";
import Link from "next/link";

export default async function ProposalPreviewPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [proposal] = await db.select().from(proposals).where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId))).limit(1);
  if (!proposal) notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const values = buildProposalPlaceholderValues({ ...proposal, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });

  return (
    <ProposalPublicView
      proposal={{
        title: proposal.title,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        validUntil: proposal.validUntil,
        status: proposal.status,
        lineItems: (proposal.lineItems ?? []) as ProposalLineItem[],
        subtotal: proposal.subtotal,
        tax: proposal.tax,
        total: proposal.total,
        currency: proposal.currency,
        downPaymentPercent: proposal.downPaymentPercent,
      }}
      blocks={normalizeDocumentBlocks(proposal.contentBlocks, "proposal")}
      placeholderValues={values}
      embedded
      topBar={
        <div className="flex items-center justify-between">
          <Link href={`/app/proposals/${proposal.id}`} className="text-sm text-slate-600 hover:underline">
            ← Back
          </Link>
          <span className="text-xs text-slate-500">Preview</span>
        </div>
      }
    />
  );
}
