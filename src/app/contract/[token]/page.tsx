import { getPublicContract } from "@/lib/actions/contracts";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { ContractPublicView } from "@/components/contracts/contract-public-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";

export default async function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicContract(token);

  if ("error" in result) {
    const messages: Record<string, { title: string; body: string; variant: "ok" | "warn" | "error" }> = {
      not_found: { title: "Contract not found", body: "This contract link is invalid or has been deleted.", variant: "error" },
      revoked: { title: "Contract revoked", body: "This contract was revoked by the workspace owner.", variant: "warn" },
      expired: { title: "Contract expired", body: "This contract link has expired. Please request a new one.", variant: "warn" },
      already_signed: { title: "Already signed", body: "This contract has already been signed. No further action needed.", variant: "ok" },
      declined: { title: "Contract declined", body: "This contract was declined.", variant: "warn" },
      not_sent: { title: "Not ready", body: "This contract hasn't been sent yet.", variant: "warn" },
    };
    const m = messages[result.error as keyof typeof messages];
    const Icon = m.variant === "ok" ? CheckCircle2 : AlertCircle;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-3">
            <Icon className={`h-10 w-10 mx-auto ${m.variant === "ok" ? "text-emerald-500" : m.variant === "warn" ? "text-amber-500" : "text-red-500"}`} />
            <h1 className="text-xl font-semibold">{m.title}</h1>
            <p className="text-sm text-slate-500">{m.body}</p>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contract, client, workspace } = result;
  const placeholderValues = buildContractPlaceholderValues({
    clientName: contract.clientName,
    clientEmail: contract.clientEmail,
    companyName: contract.companyName,
    contractNumber: contract.contractNumber,
    contractDate: contract.contractDate,
    validUntil: contract.validUntil,
    workspaceName: workspace?.name,
    workspaceAddress: workspace?.billingAddress,
  });

  return (
    <ContractPublicView
      contract={{
        title: contract.title,
        contractNumber: contract.contractNumber,
        clientName: client.name,
        clientEmail: client.email,
        validUntil: contract.validUntil,
        status: contract.status,
      }}
      blocks={normalizeDocumentBlocks(contract.contentBlocks, "contract")}
      placeholderValues={placeholderValues}
      signatureSlot={<SignaturePad token={token} defaultName={client?.name || ""} defaultEmail={client?.email || ""} />}
    />
  );
}
