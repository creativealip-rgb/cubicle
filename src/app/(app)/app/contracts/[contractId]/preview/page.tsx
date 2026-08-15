import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";
import Link from "next/link";

export default async function ContractPreviewPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [contract] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId))).limit(1);
  if (!contract) notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const values = buildContractPlaceholderValues({ ...contract, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-3xl space-y-6"><div className="flex items-center justify-between"><Link href={`/app/contracts/${contract.id}`} className="text-sm text-slate-600 hover:underline">← Back</Link><span className="text-xs text-slate-500">Preview</span></div><article className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm text-slate-500">{workspace?.name}</p><h1 className="mt-1 text-2xl font-semibold">{contract.title}</h1><p className="mt-1 text-sm text-slate-500">For: {contract.clientName}</p><div className="mt-8 space-y-4">{normalizeDocumentBlocks(contract.contentBlocks, "contract").map((block) => <div key={block.id} className={block.type === "heading" ? "text-lg font-semibold text-slate-900" : "text-slate-700"}>{renderDocumentBlockHtml(block, values)}</div>)}</div></article></div></main>;
}
