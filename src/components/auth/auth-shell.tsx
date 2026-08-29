import Image from "next/image";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = createT(await getCurrentLang("en"));
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(145deg,#111827_0%,#1e1b4b_58%,#172554_100%)] px-14 py-12 text-white lg:flex lg:flex-col xl:px-20 xl:py-16">
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#6647F0]/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />

        <Link href="https://cubiqlo.com/" aria-label={t("Kembali ke beranda Cubiqlo", "Back to Cubiqlo home")} className="relative z-10 w-fit">
          <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto brightness-0 invert" />
        </Link>

        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">{t("Workspace kerja klien", "Client work workspace")}</p>
          <h2 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-[-0.025em] xl:text-5xl">
            {t("Kerja klien lebih rapi dari awal sampai dibayar.", "Keep client work organized from start to paid.")}
          </h2>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
            {t("Satukan proyek, komunikasi, waktu kerja, dan invoice dalam satu workspace yang mudah dipantau.", "Bring projects, communication, tracked time, and invoices into one workspace you can easily monitor.")}
          </p>

          <ul className="mt-10 space-y-4">
            {[["Kelola proyek tanpa board tercecer", "Manage projects without scattered boards"], ["Bagikan progres lewat portal klien", "Share progress through a client portal"], ["Hubungkan waktu kerja ke invoice", "Connect tracked time to invoices"]].map(([id, en]) => (
              <li key={id} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-violet-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                {t(id, en)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs leading-5 text-slate-500">
          Cubiqlo · Client Operations Hub
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <Link href="https://cubiqlo.com/" aria-label={t("Kembali ke beranda Cubiqlo", "Back to Cubiqlo home")} className="mb-8 flex justify-center lg:hidden">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto" />
          </Link>
          {children}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#6647F0]" />
            <span>{t("Koneksi aman · Data workspace tetap privat", "Secure connection · Your workspace data stays private")}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
