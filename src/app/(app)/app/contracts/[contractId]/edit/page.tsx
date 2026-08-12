import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { saveContractBlocks } from "@/lib/actions/contracts";

export default async function ContractEditPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [contract] = await db.select({ id: contracts.id, contentBlocks: contracts.contentBlocks, contentRevision: contracts.contentRevision, status: contracts.status })
    .from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId))).limit(1);
  if (!contract || contract.status !== "draft") notFound();
  const blocks = normalizeDocumentBlocks(contract.contentBlocks, "contract");
  return <DocumentBlockEditor kind="contract" workspaceId={workspaceId} initialBlocks={blocks.length ? blocks : defaultDocumentBlocks("contract")} initialRevision={contract.contentRevision} saveBlocks={(next, revision) => saveContractBlocks(contractId, { contentBlocks: next, revision })} />;
}
