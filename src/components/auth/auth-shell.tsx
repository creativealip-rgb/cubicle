import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(102,71,240,.45),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(14,165,233,.2),transparent_30%)]" />
        <Link href="/" aria-label="Kembali ke beranda Cubiqlo" className="relative z-10 w-fit">
          <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto brightness-0 invert" />
        </Link>
        <div className="relative z-10 my-auto max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-violet-300">Workspace kerja klien</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight">Dari brief sampai invoice, tetap dalam satu alur.</h2>
          <ul className="mt-7 space-y-3 text-slate-300">
            {["Kelola proyek, tugas, file, dan waktu", "Bagikan progres lewat portal klien", "Ubah waktu billable menjadi invoice"].map((item) => (
              <li key={item} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" />{item}</li>
            ))}
          </ul>
          <div className="mt-9 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl">
            <Image src="/screenshots/dashboard.png" alt="Tampilan dashboard Cubiqlo" width={1440} height={900} className="rounded-xl" />
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4" />Data akun dilindungi. Tanpa kartu kredit untuk mulai.</p>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Kembali ke beranda Cubiqlo" className="mb-6 flex justify-center lg:hidden">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto" />
          </Link>
          {children}
          <p className="mt-5 text-center text-xs text-slate-500">Koneksi aman · Data workspace tetap privat</p>
        </div>
      </section>
    </main>
  );
}
