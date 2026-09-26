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
        currency: proposal.currency || "IDR",
        downPaymentPercent: proposal.downPaymentPercent,
      }}
      blocks={normalizeDocumentBlocks(proposal.contentBlocks, "proposal")}
      placeholderValues={placeholderValues}
      topBar={
        expired ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 font-medium text-center">
            Masa berlaku tautan proposal ini telah habis. Silakan hubungi pengirim untuk mendapatkan tautan baru.
          </div>
        ) : isDraft ? (
          <div className="p-4 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground font-medium text-center">
            Proposal ini masih berstatus draft.
          </div>
        ) : null
      }
      signatureSlot={
        isActionable ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Dengan menyetujui proposal ini, Anda menyetujui rincian scope, harga, dan ketentuan yang tercantum.
            </div>
            <AcceptDeclineButtons proposalId={proposal.id} token={token} />
          </div>
        ) : isAccepted ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs sm:text-sm py-2">
            <span>✓ Proposal telah disetujui</span>
          </div>
        ) : isDeclined ? (
          <div className="flex items-center justify-center gap-2 text-destructive font-bold text-xs sm:text-sm py-2">
            <span>✕ Proposal telah ditolak</span>
          </div>
        ) : null
      }
    />
  );
}
