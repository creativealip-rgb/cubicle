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
      not_found: { title: "Tautan Tidak Ditemukan", body: "Tautan formulir ini tidak valid atau sudah dihapus." },
      revoked: { title: "Tautan Dinonaktifkan", body: "Tautan formulir ini telah ditutup oleh pembuat formulir." },
      expired: { title: "Tautan Kedaluwarsa", body: "Masa berlaku tautan formulir ini telah berakhir." },
      already_submitted: { title: "Sudah Diisi", body: "Tanggapan Anda telah berhasil kami terima sebelumnya. Terima kasih." },
    };
    const m = messages[result.error as keyof typeof messages] || {
      title: "Tidak Tersedia",
      body: "Formulir tidak dapat diakses.",
    };
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl border shadow-lg">
          <CardContent className="py-12 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
            <p className="text-xs text-muted-foreground">{m.body}</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Kembali ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { questionnaire } = result;
  const fields = safeParseQuestionnaireSchema(questionnaire.schema);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block text-2xl font-black tracking-tight text-foreground">
            Cubiqlo
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Online Form & Brief
          </p>
        </div>

        {/* Form Container Card */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-lg p-6 sm:p-10 space-y-7">
          <div className="space-y-2 border-b border-border/60 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {questionnaire.name}
            </h1>
            {questionnaire.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {questionnaire.description}
              </p>
            )}
          </div>

          <IntakeForm token={token} fields={fields} />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">
            Created securely using <span className="font-semibold text-foreground">Cubiqlo Forms</span>
          </p>
        </div>
      </div>
    </div>
  );
}
