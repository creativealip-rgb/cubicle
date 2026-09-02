import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MfaRecoveryForm } from "@/components/auth/mfa-recovery-form";
import { ShieldAlert, ArrowLeft, KeyRound } from "lucide-react";

export default function MfaRecoveryPage() {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-600/15 blur-3xl pointer-events-none" />

      {/* Primary fast options notice if user still has passkey/backup code */}
      <div className="relative z-10 w-full max-w-[460px] mb-4 space-y-2">
        <div className="rounded-2xl border border-primary/20 bg-slate-900/80 backdrop-blur-md p-3.5 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Punya Passkey atau Recovery Backup Code?</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Jika kamu masih punya akses ke sidik jari/Face ID atau 10 kode cadangan, kamu bisa langsung masuk tanpa menunggu review admin 72 jam.
          </p>
          <div className="flex gap-2 pt-1">
            <Link
              href="/two-factor"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <span>← Coba verifikasi dengan Passkey / Backup Code</span>
            </Link>
          </div>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-[460px] rounded-3xl border border-slate-800 bg-card shadow-[0_24px_70px_-32px_rgba(217,119,6,0.35)] overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-600 p-6 text-white text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md mb-2">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Pemulihan Akun Manual (MFA)
          </CardTitle>
          <CardDescription className="text-xs text-white/85">
            Gunakan jalur ini jika kamu kehilangan semua akses Passkey, Authenticator App, dan Recovery Code.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Prosedur Keamanan:</strong> Pemulihan manual memerlukan masa tenang (*cooling period*) 72 jam dan persetujuan dari 2 administrator untuk mencegah pembajakan akun.
          </div>

          <MfaRecoveryForm />
        </CardContent>

        <CardFooter className="bg-muted/30 border-t p-4 flex justify-center">
          <Link
            href="/two-factor"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Verifikasi 2FA</span>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
