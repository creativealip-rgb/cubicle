import { getPublicQuestionnaire } from "@/lib/actions/questionnaires";
import { safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";
import { IntakeForm } from "@/components/questionnaires/intake-form";
import { PublicDocumentHeader } from "@/components/public/public-document-header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicQuestionnaire(token);

  if ("error" in result) {
    const messages: Record<string, { title: string; body: string }> = {
      not_found: {
        title: "Link Not Found / Tautan Tidak Ditemukan",
        body: "This form link is invalid or has been removed. / Tautan formulir ini tidak valid atau sudah dihapus.",
      },
      revoked: {
        title: "Link Disabled / Tautan Dinonaktifkan",
        body: "This form link has been closed by the author. / Tautan formulir ini telah ditutup oleh pembuat formulir.",
      },
      expired: {
        title: "Link Expired / Tautan Kedaluwarsa",
        body: "This form link validity period has expired. / Masa berlaku tautan formulir ini telah berakhir.",
      },
      already_submitted: {
        title: "Already Submitted / Sudah Diisi",
        body: "Your response has already been received. Thank you! / Tanggapan Anda telah berhasil kami terima sebelumnya. Terima kasih.",
      },
    };
    const m = messages[result.error as keyof typeof messages] || {
      title: "Unavailable / Tidak Tersedia",
      body: "This form cannot be accessed. / Formulir tidak dapat diakses.",
    };
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl border shadow-lg">
          <CardContent className="py-12 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
            <p className="text-xs text-muted-foreground">{m.body}</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to Home / Kembali ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { questionnaire, workspaceName, workspaceLogoUrl } = result;
  const fields = safeParseQuestionnaireSchema(questionnaire.schema);
  const radiusClass =
    questionnaire.cardRadius === "normal"
      ? "rounded-md"
      : questionnaire.cardRadius === "soft"
      ? "rounded-3xl"
      : "rounded-2xl";

  return (
    <div className="min-h-screen bg-slate-900/10 dark:bg-zinc-950/40 py-8 sm:py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-2xl space-y-6">
        <PublicDocumentHeader
          badgeLabel="Official Form"
          documentType="form"
          documentTitle={questionnaire.name || "Formulir"}
          workspaceName={workspaceName}
          workspaceLogoUrl={workspaceLogoUrl}
        />

        <div className={`w-full bg-card border border-border/80 ${radiusClass} p-6 sm:p-10 shadow-xl space-y-6`}>
          <IntakeForm
            token={token}
            fields={fields}
            formName={questionnaire.name}
            formDescription={questionnaire.description}
            redirectUrl={questionnaire.redirectUrl}
            thankYouMessage={questionnaire.thankYouMessage}
            themePreset={questionnaire.themePreset}
            cardRadius={questionnaire.cardRadius}
          />
        </div>
      </div>
    </div>
  );
}
