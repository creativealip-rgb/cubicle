import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const workflow = [
  {
    number: "01",
    label: "Tangkap",
    title: "Klien dan scope masuk rapi",
    text: "Kontak, brief, proposal, dan jadwal mulai dari konteks yang sama.",
    icon: Users,
  },
  {
    number: "02",
    label: "Kerjakan",
    title: "Proyek bergerak tanpa kehilangan konteks",
    text: "Task, file, komentar, dan waktu kerja tetap terhubung ke klien.",
    icon: BriefcaseBusiness,
  },
  {
    number: "03",
    label: "Kirim & tagih",
    title: "Hasil sampai, invoice ikut jalan",
    text: "Bagikan portal, kirim deliverable, lalu ubah pekerjaan menjadi tagihan.",
    icon: FileText,
  },
];

const capabilities = [
  { icon: Users, title: "Client CRM", text: "Semua konteks klien, tanpa cari ulang chat lama." },
  { icon: Clock3, title: "Time & work", text: "Task dan jam billable tetap nyambung ke proyek." },
  { icon: FolderOpen, title: "Deliverables", text: "Pisahkan file internal dari hasil untuk klien." },
  { icon: FileText, title: "Billing", text: "Proposal, invoice, dan pembayaran dalam satu alur." },
];

const pricing = [
  {
    name: "Free",
    audience: "Untuk mulai merapikan kerja klien.",
    price: "Rp 0",
    suffix: "selamanya",
    items: ["1 user", "3 clients", "Project & task", "Invoice", "Time tracking"],
    cta: "Mulai gratis",
    featured: false,
  },
  {
    name: "Solo",
    audience: "Untuk freelancer yang mulai serius.",
    price: "Rp 49rb",
    suffix: "/bulan",
    items: ["1 user", "Unlimited clients", "Client portal", "AI assistant", "Calendar & booking", "Proposal & contract"],
    cta: "Pilih Solo",
    featured: true,
  },
  {
    name: "Team",
    audience: "Untuk tim kecil yang kerja bareng.",
    price: "Rp 99rb",
    suffix: "/bulan",
    items: ["5 users", "Unlimited clients", "Shared workspace", "Team roles", "Advanced report", "Priority support"],
    cta: "Pilih Team",
    featured: false,
  },
];

const comparison = [
  { label: "Harga mulai", honeybook: "$19/mo", bonsai: "$17/mo", cubiqlo: "Gratis" },
  { label: "Client portal", honeybook: "Ada", bonsai: "Add-on", cubiqlo: "Termasuk" },
  { label: "Booking page", honeybook: "Ada", bonsai: "Add-on", cubiqlo: "Termasuk" },
  { label: "Billing IDR", honeybook: "Integrasi", bonsai: "Integrasi", cubiqlo: "Native" },
  { label: "AI assistant", honeybook: "Ada", bonsai: "Ada", cubiqlo: "Termasuk" },
];

function BrowserFrame({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.35rem] bg-white shadow-[0_28px_90px_rgba(31,24,74,0.22)] ring-1 ring-slate-950/10 ${className}`}>
      <div className="flex h-10 items-center gap-2 border-b border-slate-200/80 bg-slate-50 px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF7657]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mx-auto h-5 w-2/3 max-w-64 rounded-md bg-white ring-1 ring-slate-200" />
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover object-top" />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) redirect("https://app.cubiqlo.com/app/dashboard");

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FBFAFE] text-[#292D34]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-950/[0.06] bg-[#FBFAFE]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" aria-label="Cubiqlo home">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto object-contain" priority />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#workflow" className="hover:text-[#6647F0]">Alur kerja</a>
            <a href="#portal" className="hover:text-[#6647F0]">Portal</a>
            <a href="#compare" className="hover:text-[#6647F0]">Perbandingan</a>
            <a href="#pricing" className="hover:text-[#6647F0]">Harga</a>
          </nav>
          <div className="flex items-center gap-2">
            <details className="relative md:hidden">
              <summary aria-label="Buka menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" />
              </summary>
              <nav className="absolute right-0 top-12 w-52 rounded-2xl bg-white p-2 text-sm shadow-2xl ring-1 ring-slate-950/10">
                {[["Alur kerja", "#workflow"], ["Portal", "#portal"], ["Harga", "#pricing"]].map(([label, href]) => <a key={href} href={href} className="block rounded-xl px-3 py-2.5 hover:bg-violet-50">{label}</a>)}
                <Link href="/login" className="block rounded-xl px-3 py-2.5 hover:bg-violet-50">Masuk</Link>
              </nav>
            </details>
            <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex"><Link href="/login">Masuk</Link></Button>
            <Button asChild className="hidden rounded-xl bg-[#292D34] text-white hover:bg-[#17191E] min-[420px]:inline-flex"><Link href="/signup">Mulai gratis <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: "radial-gradient(circle at 9% 10%, rgba(102,71,240,.15), transparent 28%), radial-gradient(circle at 88% 8%, rgba(255,118,87,.12), transparent 24%)" }} />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#6647F0] shadow-sm ring-1 ring-[#6647F0]/15">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dibangun untuk bisnis berbasis klien
              </div>
              <h1 className="mt-6 max-w-full text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[#292D34] sm:max-w-[13ch] sm:text-6xl lg:text-[4.65rem]" style={{ fontWeight: 650 }}>
                Kelola kerja klien dari request sampai <span className="relative text-[#6647F0]">dibayar.<span className="absolute inset-x-0 -bottom-1 h-2 rounded-full bg-[#FF7657]/30" aria-hidden="true" /></span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Proyek, waktu, file, portal klien, dan invoice dalam satu alur. Lebih sedikit tool. Lebih banyak kerja yang selesai.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-[#292D34] px-6 text-white shadow-[0_12px_30px_rgba(41,45,52,.18)] hover:-translate-y-0.5 hover:bg-[#17191E] sm:w-auto">
                  <Link href="/signup">Buat workspace gratis <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-slate-300 bg-white/80 px-6 sm:w-auto"><Link href="#workflow">Lihat cara kerja</Link></Button>
              </div>
              <p className="mt-4 text-sm text-slate-500">Free forever · tanpa kartu kredit · setup sekitar 5 menit</p>
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-600 sm:flex sm:items-center sm:gap-5 sm:text-sm">
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">1</strong> workspace</div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">7+</strong> tool diringkas</div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">IDR</strong> sejak awal</div>
              </div>
            </div>

            <div className="relative min-w-0 lg:pl-4">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#6647F0]/20 via-transparent to-[#FF7657]/20 blur-2xl" />
              <BrowserFrame src="/screenshots/dashboard.png" alt="Dashboard Cubiqlo untuk mengelola klien, proyek, tugas, dan invoice" className="relative lg:rotate-[1deg]" />
              <div className="absolute -bottom-5 left-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-950/10 sm:left-8 sm:p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
                <div><p className="text-xs text-slate-500">Invoice terbaru</p><p className="text-sm font-semibold">Rp 8.500.000 · Dibayar</p></div>
              </div>
              <div className="absolute -right-1 -top-5 hidden rounded-2xl bg-[#6647F0] px-4 py-3 text-white shadow-xl sm:block">
                <p className="text-[10px] uppercase tracking-[.16em] text-white/70">Client update</p><p className="mt-1 text-sm font-semibold">Portal aktif</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-950/[0.06] bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="max-w-3xl text-lg font-medium leading-8 text-[#292D34] sm:text-xl">Project management berhenti di task. <span className="text-[#6647F0]">Cubiqlo lanjut sampai klien menerima hasil dan invoice dibayar.</span></p>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-400">Client operations, end-to-end</p>
          </div>
        </section>

        <section id="workflow" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">Satu alur kerja</p><h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-.03em] sm:text-5xl">Konteks ikut bergerak. Bukan disalin ulang.</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">Data klien yang masuk di awal tetap dipakai saat tim bekerja, hasil dibagikan, dan invoice dibuat.</p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
              <ol className="relative space-y-3 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-gradient-to-b before:from-[#6647F0] before:via-[#FF7657] before:to-emerald-400">
                {workflow.map((step, index) => (
                  <li key={step.number} className="group relative flex gap-4 rounded-2xl p-4 transition hover:bg-white hover:shadow-sm">
                    <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg ${index === 0 ? "bg-[#6647F0]" : index === 1 ? "bg-[#FF7657]" : "bg-emerald-500"}`}>{step.number}</span>
                    <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">{step.label}</p><h3 className="mt-1 text-lg font-semibold">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p></div>
                  </li>
                ))}
              </ol>
              <BrowserFrame src="/screenshots/tasks.png" alt="Tampilan task dan pekerjaan di Cubiqlo" />
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((item) => <div key={item.title} className="bg-white p-6"><item.icon className="h-5 w-5 text-[#6647F0]" /><h3 className="mt-5 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="portal" className="relative overflow-hidden bg-[#171624] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(102,71,240,.42), transparent 30%), radial-gradient(circle at 5% 90%, rgba(255,118,87,.18), transparent 24%)" }} />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-200 ring-1 ring-white/15"><ShieldCheck className="h-4 w-4" /> Portal klien aman</div>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-.035em] sm:text-6xl">Satu link.<br /><span className="text-violet-300">Lebih sedikit “update dong?”</span></h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Klien melihat progress, deliverable, komentar, dan invoice. Kerjaan internal tetap internal.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Progress terpilih", "File deliverable", "Komentar publik", "Link invoice", "Token aman", "Data internal terlindungi"].map(item => <div key={item} className="flex items-center gap-2 text-sm text-slate-200"><Check className="h-4 w-4 text-emerald-400" />{item}</div>)}
              </div>
            </div>
            <div className="relative rounded-[2rem] bg-white/[.07] p-3 ring-1 ring-white/15 backdrop-blur sm:p-5">
              <div className="rounded-[1.25rem] bg-[#F8F7FC] p-5 text-[#292D34] shadow-2xl sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-200 pb-5"><div><p className="text-sm text-slate-500">Client Portal</p><p className="font-semibold">Website Redesign · Acme Studio</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">68% selesai</span></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[[LayoutDashboard,"Project","12 dari 18 task selesai"],[FolderOpen,"Deliverable","3 file siap direview"],[MessageSquareText,"Update","2 komentar baru"],[FileText,"Invoice","INV-2026-004 siap dikirim"]].map(([Icon,title,text]) => { const C = Icon as typeof LayoutDashboard; return <div key={title as string} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><C className="h-5 w-5 text-[#6647F0]" /><p className="mt-4 text-sm font-semibold">{title as string}</p><p className="mt-1 text-xs text-slate-500">{text as string}</p></div>; })}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#292D34] p-4 text-white"><div><p className="text-xs text-white/60">Status invoice</p><p className="mt-1 font-semibold">Rp 8.500.000</p></div><span className="rounded-xl bg-[#FF7657] px-4 py-2 text-xs font-semibold">Lihat invoice</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="compare" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">Dibangun lebih dekat</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-5xl">Client ops tanpa harga dan workflow impor.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Mulai gratis, gunakan Rupiah, dan aktifkan portal tanpa menambah tool baru.</p></div>
            <div className="mt-12 hidden overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(41,45,52,.08)] ring-1 ring-slate-200 md:block">
              <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-6 py-5" /><th className="px-6 py-5 text-slate-500">HoneyBook</th><th className="px-6 py-5 text-slate-500">Bonsai</th><th className="bg-[#F4F0FF] px-6 py-5 text-[#6647F0]">Cubiqlo</th></tr></thead><tbody>{comparison.map(row => <tr key={row.label} className="border-t border-slate-100"><td className="px-6 py-4 font-medium">{row.label}</td><td className="px-6 py-4 text-slate-500">{row.honeybook}</td><td className="px-6 py-4 text-slate-500">{row.bonsai}</td><td className="bg-[#F4F0FF]/65 px-6 py-4 font-semibold text-[#6647F0]">{row.cubiqlo}</td></tr>)}</tbody></table>
            </div>
            <div className="mt-10 grid gap-3 md:hidden">{comparison.map(row => <div key={row.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="font-semibold">{row.label}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span className="text-slate-500">HoneyBook<br/><b className="text-slate-700">{row.honeybook}</b></span><span className="text-slate-500">Bonsai<br/><b className="text-slate-700">{row.bonsai}</b></span><span className="rounded-lg bg-[#F4F0FF] p-2 text-[#6647F0]">Cubiqlo<br/><b>{row.cubiqlo}</b></span></div></div>)}</div>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">Perbandingan dari halaman publik produk, diperiksa Juli 2026. Harga dan paket dapat berubah.</p>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-[#F0ECFF] p-6 sm:p-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
            <div><Sparkles className="h-6 w-6 text-[#6647F0]" /><p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-[#6647F0]">Bukti produk, bukan janji</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Lihat bagaimana satu update mengalir ke seluruh workspace.</h2><Link href="/signup" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#6647F0]">Coba dengan data sendiri <ChevronRight className="h-4 w-4" /></Link></div>
            <div className="grid gap-3 sm:grid-cols-3">{workflow.map(step => <div key={step.number} className="rounded-2xl bg-white p-5 shadow-sm"><span className="text-xs font-semibold text-[#6647F0]">{step.number} · {step.label}</span><h3 className="mt-8 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p></div>)}</div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">Harga transparan</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-5xl">Mulai gratis. Upgrade saat bisnis bergerak.</h2><p className="mt-5 text-lg text-slate-600">Tidak perlu kartu kredit untuk mulai.</p></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">{pricing.map(plan => <div key={plan.name} className={`relative flex flex-col rounded-3xl p-6 ${plan.featured ? "bg-[#292D34] text-white shadow-[0_24px_70px_rgba(41,45,52,.22)] lg:-translate-y-3" : "bg-[#FBFAFE] ring-1 ring-slate-200"}`}>{plan.featured && <span className="absolute right-5 top-5 rounded-full bg-[#FF7657] px-3 py-1 text-xs font-semibold">Paling populer</span>}<p className={`text-sm font-semibold ${plan.featured ? "text-violet-300" : "text-[#6647F0]"}`}>{plan.name}</p><p className={`mt-3 text-sm ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>{plan.audience}</p><div className="mt-7 flex items-end gap-2"><strong className="text-3xl tracking-[-.03em]">{plan.price}</strong><span className={`pb-1 text-xs ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>{plan.suffix}</span></div><div className={`my-6 h-px ${plan.featured ? "bg-white/10" : "bg-slate-200"}`} /><div className="flex-1 space-y-3">{plan.items.map(item => <div key={item} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-slate-200" : "text-slate-700"}`}><Check className={`h-4 w-4 ${plan.featured ? "text-emerald-400" : "text-[#6647F0]"}`} />{item}</div>)}</div><Button asChild className={`mt-8 h-11 rounded-xl ${plan.featured ? "bg-white text-[#292D34] hover:bg-violet-50" : "bg-[#292D34] text-white hover:bg-[#17191E]"}`}><Link href="/signup">{plan.cta}<ArrowRight className="h-4 w-4" /></Link></Button></div>)}</div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#6647F0] via-[#7456F4] to-[#FF7657] px-6 py-14 text-center text-white shadow-[0_30px_90px_rgba(102,71,240,.28)] sm:px-12 sm:py-16"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">Kerja klien, lebih tenang</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Satu workspace dari request pertama sampai pembayaran.</h2><p className="mx-auto mt-5 max-w-xl text-lg text-white/80">Mulai gratis. Rapikan satu klien hari ini.</p><Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-white px-6 text-[#292D34] hover:bg-violet-50"><Link href="/signup">Buat workspace gratis <ArrowRight className="h-4 w-4" /></Link></Button></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-9 w-auto" /><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Client operations hub untuk freelancer, agency, dan tim jasa.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><a href="#workflow">Alur kerja</a><a href="#pricing">Harga</a><Link href="/terms">Syarat</Link><Link href="/privacy">Privasi</Link><span>© 2026 Cubiqlo</span></div></div></footer>
    </div>
  );
}
