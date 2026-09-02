import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MfaSetupForm } from "@/components/auth/mfa-setup-form";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ force?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?redirect=/mfa/setup");
  const params = searchParams ? await searchParams : {};
  if (session.user.twoFactorEnabled && params.force !== "1") redirect("/app/settings?tab=account");

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl pointer-events-none" />

      {/* Top bar back link */}
      <div className="relative z-10 w-full max-w-[520px] mb-4 flex items-center justify-between">
        <Link
          href="/app/settings?tab=account"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Pengaturan Akun</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Cubiqlo Auth Guard</span>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="relative z-10 w-full">
        <MfaSetupForm />
      </div>
    </div>
  );
}
