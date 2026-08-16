import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, workspaces } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";
import { ContractPublicView } from "@/components/contracts/contract-public-view";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import Link from "next/link";

export default async function ContractPreviewPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const workspaceId = await getWorkspaceForCurrentUser();
  const [contract] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId))).limit(1);
  if (!contract) notFound();
  const [workspace] = await db.select({ name: workspaces.name, billingAddress: workspaces.billingAddress }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const placeholderValues = buildContractPlaceholderValues({ ...contract, workspaceName: workspace?.name, workspaceAddress: workspace?.billingAddress });

  return (
    <ContractPublicView
      contract={{
        title: contract.title,
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        validUntil: contract.validUntil,
        status: contract.status,
      }}
      blocks={normalizeDocumentBlocks(contract.contentBlocks, "contract")}
      placeholderValues={placeholderValues}
      embedded
      topBar={
        <div className="flex items-center justify-between">
          <Link href={`/app/contracts/${contract.id}`} className="text-sm text-slate-600 hover:underline">
            ← Back
          </Link>
          <span className="text-xs text-slate-500">Preview</span>
        </div>
      }
    />
  );
}
