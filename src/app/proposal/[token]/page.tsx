import { db } from "@/db";
import { proposals, clients, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import crypto from "crypto";
import { notFound } from "next/navigation";
import { AcceptDeclineButtons } from "@/components/proposals/accept-decline-buttons";
import { ProposalPublicView } from "@/components/proposals/proposal-public-view";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";

interface ProposalPageProps {
  params: Promise<{ token: string }>;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function PublicProposalPage({ params }: ProposalPageProps) {
  const { token } = await params;
  const tokenHash = hashToken(token);
  const [proposal] = await db
    .select({
      id: proposals.id,
      workspaceId: proposals.workspaceId,
      title: proposals.title,
      body: proposals.body,
      contentBlocks: proposals.contentBlocks,
      lineItems: proposals.lineItems,
      subtotal: proposals.subtotal,
      tax: proposals.tax,
      total: proposals.total,
      currency: proposals.currency,
      downPaymentPercent: proposals.downPaymentPercent,
      validUntil: proposals.validUntil,
      status: proposals.status,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      declineReason: proposals.declineReason,
      sharedTokenExpiresAt: proposals.sharedTokenExpiresAt,
      sentAt: proposals.sentAt,
      viewedAt: proposals.viewedAt,
      clientName: proposals.clientName,
      clientEmail: proposals.clientEmail,
      companyName: proposals.companyName,
      proposalNumber: proposals.proposalNumber,
      workspaceName: workspaces.name,
      workspaceAddress: workspaces.billingAddress,
    })
    .from(proposals)
    .leftJoin(clients, eq(clients.id, proposals.clientId))
    .innerJoin(workspaces, eq(workspaces.id, proposals.workspaceId))
    .where(eq(proposals.sharedTokenHash, tokenHash))
    .limit(1);
  if (!proposal) notFound();

  const expired = proposal.sharedTokenExpiresAt ? new Date() > proposal.sharedTokenExpiresAt : false;
  const isAccepted = proposal.status === "accepted";
  const isDeclined = proposal.status === "declined";
  const isDraft = proposal.status === "draft";
  const isActionable = !expired && !isAccepted && !isDeclined && !isDraft;

  // Mark viewed + notify workspace once (first view only)
  if (!proposal.viewedAt && proposal.status === "sent") {
    try {
      await db
        .update(proposals)
        .set({ viewedAt: new Date(), status: "viewed", updatedAt: new Date() })
        .where(eq(proposals.id, proposal.id));
      await notifyWorkspaceMembers(proposal.workspaceId, {
        type: "proposal_viewed",
        title: `${proposal.clientName} viewed proposal`,
        body: proposal.title,
        link: `/app/proposals/${proposal.id}`,
        entityType: "proposal",
        entityId: proposal.id,
        actorId: null,
      });
    } catch {
      // best-effort
    }
  }

  const placeholderValues = buildProposalPlaceholderValues({
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    companyName: proposal.companyName,
    proposalNumber: proposal.proposalNumber,
    validUntil: proposal.validUntil,
    workspaceName: proposal.workspaceName,
    workspaceAddress: proposal.workspaceAddress,
    subtotal: Number(proposal.subtotal),
    tax: Number(proposal.tax),
    total: Number(proposal.total),
    downPaymentAmount: Number(proposal.total) * Number(proposal.downPaymentPercent) / 100,
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {expired && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            This proposal link has expired. Please contact the sender for a new one.
          </div>
        )}
        {isDraft && (
          <div className="mb-4 p-4 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700">
            This proposal hasn&apos;t been sent yet.
          </div>
        )}
        <ProposalPublicView
          proposal={{
            title: proposal.title,
            clientName: proposal.clientName,
            clientEmail: proposal.clientEmail,
            validUntil: proposal.validUntil,
            status: proposal.status,
            lineItems: (proposal.lineItems ?? []) as import("@/components/proposals/proposal-public-view").ProposalLineItem[],
            subtotal: proposal.subtotal,
            tax: proposal.tax,
            total: proposal.total,
            currency: proposal.currency,
            downPaymentPercent: proposal.downPaymentPercent,
          }}
          blocks={normalizeDocumentBlocks(proposal.contentBlocks, "proposal")}
          placeholderValues={placeholderValues}
          signatureSlot={
            isActionable ? (
              <AcceptDeclineButtons proposalId={proposal.id} token={token} />
            ) : null
          }
        />
        {isAccepted && (
          <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
            <h2 className="text-lg font-semibold text-emerald-900">Proposal accepted</h2>
            <p className="text-sm text-emerald-700 mt-1">
              Thank you. We&apos;ve started the project and a down-payment invoice is on its way.
            </p>
          </div>
        )}
        {isDeclined && (
          <div className="mt-8 p-6 bg-slate-100 border border-slate-200 rounded-lg text-center">
            <h2 className="text-lg font-semibold text-slate-700">Proposal declined</h2>
            {proposal.declineReason && (
              <p className="text-sm text-slate-600 mt-1">Reason: {proposal.declineReason}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
