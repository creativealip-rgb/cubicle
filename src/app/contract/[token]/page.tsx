import { getPublicContract } from "@/lib/actions/contracts";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, AlertCircle, FileText, X } from "lucide-react";

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

  const { contract, client } = result;
  const variables = (contract.variables as Record<string, string>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center pt-4">
          <Link href="/" className="inline-block text-xl font-semibold text-slate-900">Cubicle</Link>
          <p className="text-xs text-slate-500 mt-1">E-signature</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Contract</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
            {client && (
              <p className="text-sm text-slate-500 mt-1">
                For: <span className="font-medium text-slate-700">{client.name}</span>
                {client.email && ` · ${client.email}`}
              </p>
            )}
            {contract.validUntil && (
              <p className="text-xs text-slate-500 mt-1">
                Valid until: {new Date(contract.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            {contract.status === "viewed" && (
              <Badge variant="secondary" className="mt-2">Viewed — awaiting signature</Badge>
            )}
          </div>

          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{contract.bodyResolved || contract.body}</ReactMarkdown>
            </div>
          </div>

          <div className="border-t bg-slate-50 px-6 py-5">
            <SignaturePad token={token} defaultName={client?.name || ""} defaultEmail={client?.email || ""} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Powered by <Link href="/" className="hover:underline">Cubicle</Link>
        </p>
      </div>
    </div>
  );
}
