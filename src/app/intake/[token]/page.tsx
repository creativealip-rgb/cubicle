import { getPublicQuestionnaire } from "@/lib/actions/questionnaires";
import { safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";
import { IntakeForm } from "@/components/questionnaires/intake-form";
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

  const { questionnaire } = result;
  const fields = safeParseQuestionnaireSchema(questionnaire.schema);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-10 px-4">
      <IntakeForm token={token} fields={fields} />
    </div>
  );
}
