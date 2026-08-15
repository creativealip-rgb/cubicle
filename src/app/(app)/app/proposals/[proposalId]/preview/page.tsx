import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";
import Link from "next/link";

export default async function ProposalPreviewPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [proposal] = await db.select().from(proposals).where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, workspaceId))).limit(1);
  if (!proposal) notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const values = buildProposalPlaceholderValues({ ...proposal, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-3xl space-y-6"><div className="flex items-center justify-between"><Link href={`/app/proposals/${proposal.id}`} className="text-sm text-slate-600 hover:underline">← Back</Link><span className="text-xs text-slate-500">Preview</span></div><article className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm text-slate-500">{workspace?.name}</p><h1 className="mt-1 text-2xl font-semibold">{proposal.title}</h1><p className="mt-1 text-sm text-slate-500">For: {proposal.clientName}</p><div className="mt-8 space-y-4">{normalizeDocumentBlocks(proposal.contentBlocks, "proposal").map((block) => <div key={block.id} className={block.type === "heading" ? "text-lg font-semibold text-slate-900" : "text-slate-700"}>{renderDocumentBlockHtml(block, values)}</div>)}</div></article></div></main>;
}
