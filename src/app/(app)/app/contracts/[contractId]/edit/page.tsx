import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { saveContractBlocks } from "@/lib/actions/contracts";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";

export default async function ContractEditPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [contract] = await db.select({ id: contracts.id, contentBlocks: contracts.contentBlocks, contentRevision: contracts.contentRevision, status: contracts.status, clientName: contracts.clientName, clientEmail: contracts.clientEmail, companyName: contracts.companyName, contractNumber: contracts.contractNumber, contractDate: contracts.contractDate, validUntil: contracts.validUntil })
    .from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId))).limit(1);
  if (!contract || contract.status !== "draft") notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const blocks = normalizeDocumentBlocks(contract.contentBlocks, "contract");
  const placeholderValues = buildContractPlaceholderValues({ ...contract, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });
  return <DocumentBlockEditor kind="contract" workspaceId={workspaceId} initialBlocks={blocks.length ? blocks : defaultDocumentBlocks("contract")} initialRevision={contract.contentRevision} placeholderValues={placeholderValues} saveBlocks={(next, revision) => saveContractBlocks(contractId, { contentBlocks: next, revision })} />;
}
