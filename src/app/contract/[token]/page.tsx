import { getPublicContract } from "@/lib/actions/contracts";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import { buildContractPlaceholderValues } from "@/lib/document-placeholder-values";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = createT(await getCurrentLang());
  const result = await getPublicContract(token);

  if ("error" in result) {
    const messages: Record<string, { title: string; body: string; variant: "ok" | "warn" | "error" }> = {
      not_found: { title: t("Kontrak tidak ditemukan", "Contract not found"), body: t("Tautan kontrak tidak valid atau sudah dihapus.", "This contract link is invalid or has been deleted."), variant: "error" },
      revoked: { title: t("Kontrak dicabut", "Contract revoked"), body: t("Kontrak ini dicabut oleh pemilik workspace.", "This contract was revoked by the workspace owner."), variant: "warn" },
      expired: { title: t("Kontrak kedaluwarsa", "Contract expired"), body: t("Tautan kontrak ini sudah kedaluwarsa. Minta tautan baru.", "This contract link has expired. Please request a new one."), variant: "warn" },
      already_signed: { title: t("Sudah ditandatangani", "Already signed"), body: t("Kontrak ini sudah ditandatangani. Tidak ada tindakan lanjutan.", "This contract has already been signed. No further action needed."), variant: "ok" },
      declined: { title: t("Kontrak ditolak", "Contract declined"), body: t("Kontrak ini ditolak.", "This contract was declined."), variant: "warn" },
      not_sent: { title: t("Belum siap", "Not ready"), body: t("Kontrak ini belum dikirim.", "This contract hasn't been sent yet."), variant: "warn" },
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
              <Link href="/">{t("Kembali ke beranda", "Back to home")}</Link>
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center pt-4">
          <Link href="/" className="inline-block text-xl font-semibold text-slate-900">Cubiqlo</Link>
          <p className="text-xs text-slate-500 mt-1">{t("Tanda tangan elektronik", "E-signature")}</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">{t("Kontrak", "Contract")}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
            {client && (
              <p className="text-sm text-slate-500 mt-1">
                {t("Untuk", "For")}: <span className="font-medium text-slate-700">{client.name}</span>
                {client.email && ` · ${client.email}`}
              </p>
            )}
            {contract.validUntil && (
              <p className="text-xs text-slate-500 mt-1">
                {t("Berlaku sampai", "Valid until")}: {new Date(contract.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            {contract.status === "viewed" && (
              <Badge variant="secondary" className="mt-2">{t("Dilihat — menunggu tanda tangan", "Viewed — awaiting signature")}</Badge>
            )}
          </div>

          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{contract.bodyResolved || contract.body}</ReactMarkdown>
            </div>
            {normalizeDocumentBlocks(contract.contentBlocks, "contract").map((block) => (
              <div key={block.id} className={`mt-3 text-sm ${block.type === "heading" ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                {renderDocumentBlockHtml(block, placeholderValues)}
              </div>
            ))}
          </div>

          <div className="border-t bg-slate-50 px-6 py-5">
            <SignaturePad token={token} defaultName={client?.name || ""} defaultEmail={client?.email || ""} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          {t("Didukung oleh", "Powered by")} <Link href="/" className="hover:underline">Cubiqlo</Link>
        </p>
      </div>
    </div>
  );
}
