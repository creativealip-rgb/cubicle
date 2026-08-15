import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { saveContractBlocks } from "@/lib/actions/contracts";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function ContractEditPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  if (!isUuid(contractId)) notFound();
  const workspaceId = await getWorkspaceForCurrentUser();
  const [contract] = await db.select({ id: contracts.id, contentBlocks: contracts.contentBlocks, contentRevision: contracts.contentRevision, status: contracts.status, clientName: contracts.clientName, clientEmail: contracts.clientEmail, companyName: contracts.companyName, contractNumber: contracts.contractNumber, contractDate: contracts.contractDate, validUntil: contracts.validUntil })
    .from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId))).limit(1);
  if (!contract || contract.status !== "draft") notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const blocks = normalizeDocumentBlocks(contract.contentBlocks, "contract");
  const placeholderValues = buildContractPlaceholderValues({ ...contract, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });
  async function saveBlocks(next: Parameters<typeof saveContractBlocks>[1]["contentBlocks"], revision: number) {
    "use server";
    return saveContractBlocks(contractId, { contentBlocks: next, revision });
  }
  return <DocumentBlockEditor kind="contract" workspaceId={workspaceId} initialBlocks={blocks.length ? blocks : defaultDocumentBlocks("contract")} initialRevision={contract.contentRevision} backHref={`/app/contracts/${contractId}`} placeholderValues={placeholderValues} saveBlocks={saveBlocks} />;
}
