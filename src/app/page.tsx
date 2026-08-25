import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { cookies } from "next/headers";
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
import { getCurrentLang, createT } from "@/lib/i18n";
import { LandingLanguageSwitch } from "@/components/landing/landing-language-switch";
import { LandingCurrencySwitch } from "@/components/landing/landing-currency-switch";
import { getCountryFromHeaders, resolveVisitorPreferences } from "@/lib/region-preferences";
import { getLandingPrice, type DisplayCurrency } from "@/lib/landing-pricing";

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
    audience: "Coba dulu untuk client work kecil.",
    price: "Rp 0",
    suffix: "selamanya",
    items: ["1 user", "1 workspace", "3 klien", "5 proyek", "10 invoice/month", "Client portal + AI", "10 AI requests/month", "5 MB/file"],
    cta: "Mulai gratis",
    featured: false,
  },
  {
    name: "Solo",
    audience: "Untuk freelancer yang mulai serius.",
    price: "Rp 75.000/month",
    suffix: "Billed yearly: Rp 900.000/year",
    items: ["1 user", "Existing Solo workspace rule", "5 GB/workspace", "Client portal + AI", "100 AI requests/month", "25 MB/file"],
    cta: "Pilih Solo",
    featured: true,
  },
  {
    name: "Team",
    audience: "Untuk tim kecil yang kerja bareng.",
    price: "Rp 165.000/month",
    suffix: "Billed yearly: Rp 1.980.000/year",
    items: ["Up to 5 members/workspace", "Up to 3 workspaces", "5 GB/workspace", "Team roles", "1,000 AI requests/month", "50 MB/file"],
    cta: "Pilih Team",
    featured: false,
  },
];

const landingEn: Record<string, string> = { "Client CRM": "Client CRM", "Time & work": "Time & work", Deliverables: "Deliverables", Billing: "Billing", Free: "Free", "1 user": "1 user", "10 invoice/month": "10 invoices/month", "Client portal + AI": "Client portal + AI", "10 AI requests/month": "10 AI requests/month", "5 MB/file": "5 MB/file", "Existing Solo workspace rule": "Solo workspace rule", "100 AI requests/month": "100 AI requests/month", "25 MB/file": "25 MB/file", "Up to 5 members/workspace": "Up to 5 members/workspace", "Up to 3 workspaces": "Up to 3 workspaces", "Team roles": "Team roles", "1,000 AI requests/month": "1,000 AI requests/month", "50 MB/file": "50 MB/file" };

const comparison = [
  { label: "Harga mulai", honeybook: "$19/mo", bonsai: "$17/mo", cubiqlo: "Gratis" },
  { label: "Client portal", honeybook: "Ada", bonsai: "Add-on", cubiqlo: "Termasuk" },
  { label: "Booking page", honeybook: "Ada", bonsai: "Add-on", cubiqlo: "Termasuk" },
  { label: "Billing", honeybook: "Integration", bonsai: "Integration", cubiqlo: "Native" },
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
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const country = getCountryFromHeaders(requestHeaders);
  const preferences = resolveVisitorPreferences({
    country,
    currencyCookie: cookieStore.get("cubiqlo_currency")?.value,
  });
  const currency: DisplayCurrency = preferences.currency;
  const lang = await getCurrentLang(preferences.lang);
  const t = createT(lang);
  const tx = (id: string, en: string) => t(id, en);
  const workflowCopy = [
    ["Tangkap", "Capture", "Klien dan scope masuk rapi", "Clients and scope stay organized", "Kontak, brief, proposal, dan jadwal mulai dari konteks yang sama.", "Contacts, briefs, proposals, and schedules start from one shared context."],
    ["Kerjakan", "Deliver", "Proyek bergerak tanpa kehilangan konteks", "Projects move without losing context", "Task, file, komentar, dan waktu kerja tetap terhubung ke klien.", "Tasks, files, comments, and tracked time stay connected to clients."],
    ["Kirim & tagih", "Send & bill", "Hasil sampai, invoice ikut jalan", "Deliver results, get paid", "Bagikan portal, kirim deliverable, lalu ubah pekerjaan menjadi tagihan.", "Share the portal, send deliverables, and turn work into invoices."],
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FBFAFE] text-[#292D34]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-950/[0.06] bg-[#FBFAFE]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" aria-label="Cubiqlo home">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-10 w-auto object-contain" priority />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#workflow" className="hover:text-[#6647F0]">{t("Alur kerja", "Workflow")}</a>
            <a href="#portal" className="hover:text-[#6647F0]">{t("Portal", "Portal")}</a>
            <a href="#compare" className="hover:text-[#6647F0]">{t("Perbandingan", "Compare")}</a>
            <a href="#pricing" className="hover:text-[#6647F0]">{t("Harga", "Pricing")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LandingLanguageSwitch initialLang={lang} />
            <LandingCurrencySwitch initialCurrency={currency} />
            <details className="relative md:hidden">
              <summary aria-label="Buka menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" />
              </summary>
              <nav className="absolute right-0 top-12 w-52 rounded-2xl bg-white p-2 text-sm shadow-2xl ring-1 ring-slate-950/10">
                {[[tx("Alur kerja", "Workflow"), "#workflow"], [tx("Portal", "Portal"), "#portal"], [tx("Harga", "Pricing"), "#pricing"]].map(([label, href]) => <a key={href} href={href} className="block rounded-xl px-3 py-2.5 hover:bg-violet-50">{label}</a>)}
                <Link href="/login" className="block rounded-xl px-3 py-2.5 hover:bg-violet-50">{tx("Masuk", "Log in")}</Link>
              </nav>
            </details>
            <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex"><Link href="/login">{tx("Masuk", "Log in")}</Link></Button>
            <Button asChild className="hidden rounded-xl bg-[#292D34] text-white hover:bg-[#17191E] min-[420px]:inline-flex"><Link href="/signup">{tx("Mulai gratis", "Start free")} <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: "radial-gradient(circle at 9% 10%, rgba(102,71,240,.15), transparent 28%), radial-gradient(circle at 88% 8%, rgba(255,118,87,.12), transparent 24%)" }} />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#6647F0] shadow-sm ring-1 ring-[#6647F0]/15">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {tx("Dibangun untuk bisnis berbasis klien", "Built for client-based businesses")}
              </div>
              <h1 className="mt-6 max-w-full text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[#292D34] sm:max-w-[13ch] sm:text-6xl lg:text-[4.65rem]" style={{ fontWeight: 650 }}>
                {tx("Lebih sedikit aplikasi. ", "Fewer apps. ")}<span className="text-[#6647F0] underline decoration-[#FF7657]/45 decoration-4 underline-offset-4">{tx("Lebih banyak pekerjaan selesai.", "More work delivered.")}</span>
              </h1>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-[#292D34] px-6 text-white shadow-[0_12px_30px_rgba(41,45,52,.18)] hover:-translate-y-0.5 hover:bg-[#17191E] sm:w-auto">
                  <Link href="/signup">{tx("Buat workspace gratis", "Create free workspace")} <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-slate-300 bg-white/80 px-6 sm:w-auto"><Link href="#workflow">{tx("Lihat cara kerja", "See how it works")}</Link></Button>
              </div>
              <p className="mt-4 text-sm text-slate-500">{tx("Gratis selamanya · tanpa kartu kredit · langsung bisa dipakai", "Free forever · no credit card · ready to use")}</p>
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-600 sm:flex sm:items-center sm:gap-5 sm:text-sm">
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">1</strong> {tx("workspace", "workspace")}</div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">7+</strong> {tx("tool diringkas", "tools combined")}</div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div><strong className="block text-lg text-[#292D34] sm:text-xl">7+</strong> {tx("fitur terhubung", "connected features")}</div>
              </div>
            </div>

            <div className="relative min-w-0 lg:pl-4">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#6647F0]/20 via-transparent to-[#FF7657]/20 blur-2xl" />
              <BrowserFrame src="/screenshots/dashboard.png" alt="Dashboard Cubiqlo untuk mengelola klien, proyek, tugas, dan invoice" className="relative" />
              <div className="absolute -bottom-5 left-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-950/10 sm:left-8 sm:p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
                <div><p className="text-xs text-slate-500">{tx("Invoice terbaru", "Latest invoice")}</p><p className="text-sm font-semibold">Rp 8.500.000 · {tx("Dibayar", "Paid")}</p></div>
              </div>
              <div className="absolute -right-1 -top-5 hidden rounded-2xl bg-[#6647F0] px-4 py-3 text-white shadow-xl sm:block">
                <p className="text-[10px] uppercase tracking-[.16em] text-white/70">{tx("Pembaruan klien", "Client update")}</p><p className="mt-1 text-sm font-semibold">{tx("Portal aktif", "Portal active")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-950/[0.06] bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="max-w-3xl text-lg font-medium leading-8 text-[#292D34] sm:text-xl">{tx("Project management berhenti di task. ", "Project management stops at tasks. ")}<span className="text-[#6647F0]">{tx("Cubiqlo lanjut sampai hasil diterima dan invoice dibayar.", "Cubiqlo keeps going until work is accepted and invoices are paid.")}</span></p>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-400">{tx("Dari proyek sampai pembayaran", "From project to payment")}</p>
          </div>
        </section>

        <section id="workflow" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">{tx("Satu alur kerja", "One workflow")}</p><h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-.03em] sm:text-5xl">{tx("Data cukup dimasukkan sekali. Sisanya tetap terhubung.", "Enter data once. Everything stays connected.")}</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">{tx("Informasi klien yang Anda masukkan di awal ikut ke proyek, portal, dan invoice tanpa input ulang.", "Client information flows into projects, portals, and invoices without re-entry.")}</p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
              <ol className="relative space-y-3 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-gradient-to-b before:from-[#6647F0] before:via-[#FF7657] before:to-emerald-400">
                {workflow.map((step, index) => (
                  <li key={step.number} className="group relative flex gap-4 rounded-2xl p-4 transition hover:bg-white hover:shadow-sm">
                    <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg ${index === 0 ? "bg-[#6647F0]" : index === 1 ? "bg-[#FF7657]" : "bg-emerald-500"}`}>{step.number}</span>
                    <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">{tx(workflowCopy[index][0], workflowCopy[index][1])}</p><h3 className="mt-1 text-lg font-semibold">{tx(workflowCopy[index][2], workflowCopy[index][3])}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{tx(workflowCopy[index][4], workflowCopy[index][5])}</p></div>
                  </li>
                ))}
              </ol>
              <BrowserFrame src="/screenshots/tasks.png" alt="Tampilan task dan pekerjaan di Cubiqlo" />
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((item) => <div key={item.title} className="bg-white p-6"><item.icon className="h-5 w-5 text-[#6647F0]" /><h3 className="mt-5 font-semibold">{tx(item.title, landingEn[item.title] ?? item.title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{tx(item.text, item.title === "Client CRM" ? "All client context, without digging through old chats." : item.title === "Time & work" ? "Tasks and billable hours stay connected to projects." : item.title === "Deliverables" ? "Keep internal files separate from client deliverables." : "Proposals, invoices, and payments in one flow.")}</p></div>)}
            </div>
          </div>
        </section>

        <section id="portal" className="relative overflow-hidden bg-[#171624] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(102,71,240,.42), transparent 30%), radial-gradient(circle at 5% 90%, rgba(255,118,87,.18), transparent 24%)" }} />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-200 ring-1 ring-white/15"><ShieldCheck className="h-4 w-4" /> {tx("Portal klien aman", "Secure client portal")}</div>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-.035em] sm:text-6xl">{tx("Satu link.", "One link.")}<br /><span className="text-violet-300">{tx("Lebih sedikit “update dong?”", "Fewer “any updates?” messages")}</span></h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{tx("Klien melihat progress, hasil kerja, komentar, dan invoice. Mereka hanya melihat yang Anda bagikan. Catatan internal tetap aman.", "Clients see progress, deliverables, comments, and invoices. They see only what you share. Internal notes stay private.")}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[["Progress terpilih", "Selected progress"], ["File deliverable", "Deliverable files"], ["Komentar publik", "Public comments"], ["Link invoice", "Invoice link"], ["Token aman", "Secure token"], ["Data internal terlindungi", "Internal data protected"]].map(([id, en]) => <div key={id} className="flex items-center gap-2 text-sm text-slate-200"><Check className="h-4 w-4 text-emerald-400" />{tx(id, en)}</div>)}
              </div>
            </div>
            <div className="relative rounded-[2rem] bg-white/[.07] p-3 ring-1 ring-white/15 backdrop-blur sm:p-5">
              <div className="rounded-[1.25rem] bg-[#F8F7FC] p-5 text-[#292D34] shadow-2xl sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-200 pb-5"><div><p className="text-sm text-slate-500">{tx("Portal Klien", "Client Portal")}</p><p className="font-semibold">Website Redesign · Acme Studio</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{tx("68% selesai", "68% complete")}</span></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[[LayoutDashboard,"Project","12 dari 18 task selesai","12 of 18 tasks complete"],[FolderOpen,"Deliverable","3 file siap direview","3 files ready for review"],[MessageSquareText,"Update","2 komentar baru","2 new comments"],[FileText,"Invoice","INV-2026-004 siap dikirim","INV-2026-004 ready to send"]].map(([Icon,title,idText,enText]) => { const C = Icon as typeof LayoutDashboard; return <div key={title as string} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><C className="h-5 w-5 text-[#6647F0]" /><p className="mt-4 text-sm font-semibold">{tx(title as string, title as string)}</p><p className="mt-1 text-xs text-slate-500">{tx(idText as string, enText as string)}</p></div>; })}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#292D34] p-4 text-white"><div><p className="text-xs text-white/60">{tx("Status invoice", "Invoice status")}</p><p className="mt-1 font-semibold">Rp 8.500.000</p></div><span className="rounded-xl bg-[#FF7657] px-4 py-2 text-xs font-semibold">{tx("Lihat invoice", "View invoice")}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="compare" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">{tx("Untuk bisnis berbasis klien", "For client-based businesses")}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-5xl">{tx("Dibuat untuk cara kerja bisnis modern.", "Built for modern client work.")}</h2><p className="mt-5 text-lg leading-8 text-slate-600">{tx("Mulai gratis, kelola pekerjaan klien tanpa add-on tambahan.", "Start free, manage client work without extra add-ons.")}</p></div>
            <div className="mt-12 hidden overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(41,45,52,.08)] ring-1 ring-slate-200 md:block">
              <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-6 py-5" /><th className="px-6 py-5 text-slate-500">HoneyBook</th><th className="px-6 py-5 text-slate-500">Bonsai</th><th className="bg-[#F4F0FF] px-6 py-5 text-[#6647F0]">Cubiqlo</th></tr></thead><tbody>{comparison.map(row => <tr key={row.label} className="border-t border-slate-100"><td className="px-6 py-4 font-medium">{tx(row.label, row.label === "Harga mulai" ? "Starting price" : row.label)}</td><td className="px-6 py-4 text-slate-500">{tx(row.honeybook, row.honeybook === "Ada" ? "Yes" : row.honeybook)}</td><td className="px-6 py-4 text-slate-500">{tx(row.bonsai, row.bonsai === "Ada" ? "Yes" : row.bonsai === "Termasuk" ? "Included" : row.bonsai)}</td><td className="bg-[#F4F0FF]/65 px-6 py-4 font-semibold text-[#6647F0]">{tx(row.cubiqlo, row.cubiqlo === "Gratis" ? "Free" : row.cubiqlo === "Termasuk" ? "Included" : row.cubiqlo)}</td></tr>)}</tbody></table>
            </div>
            <div className="mt-10 grid gap-3 md:hidden">{comparison.map(row => <div key={row.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="font-semibold">{tx(row.label, row.label === "Harga mulai" ? "Starting price" : row.label)}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span className="text-slate-500">HoneyBook<br/><b className="text-slate-700">{tx(row.honeybook, row.honeybook === "Ada" ? "Yes" : row.honeybook)}</b></span><span className="text-slate-500">Bonsai<br/><b className="text-slate-700">{tx(row.bonsai, row.bonsai === "Ada" ? "Yes" : row.bonsai)}</b></span><span className="rounded-lg bg-[#F4F0FF] p-2 text-[#6647F0]">Cubiqlo<br/><b>{tx(row.cubiqlo, row.cubiqlo === "Gratis" ? "Free" : row.cubiqlo === "Termasuk" ? "Included" : row.cubiqlo)}</b></span></div></div>)}</div>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">{tx("Perbandingan dari halaman publik produk, diperiksa Juli 2026. Harga dan paket dapat berubah.", "Comparison based on public product pages, checked July 2026. Prices and packages may change.")}</p>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-[#F0ECFF] p-6 sm:p-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
            <div><Sparkles className="h-6 w-6 text-[#6647F0]" /><p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-[#6647F0]">{tx("Bukti produk, bukan janji", "Product proof, not promises")}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{tx("Lihat bagaimana satu update mengalir ke seluruh workspace.", "See how one update flows across your workspace.")}</h2><Link href="/signup" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#6647F0]">{tx("Coba dengan data sendiri", "Try it with your own data")} <ChevronRight className="h-4 w-4" /></Link></div>
            <div className="grid gap-3 sm:grid-cols-3">{workflow.map((step, i) => <div key={step.number} className="rounded-2xl bg-white p-5 shadow-sm"><span className="text-xs font-semibold text-[#6647F0]">{step.number} · {tx(workflowCopy[i][0], workflowCopy[i][1])}</span><h3 className="mt-8 font-semibold">{tx(workflowCopy[i][2], workflowCopy[i][3])}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{tx(workflowCopy[i][4], workflowCopy[i][5])}</p></div>)}</div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6647F0]">{tx("Harga transparan", "Transparent pricing")}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em] sm:text-5xl">{tx("Mulai gratis. Upgrade saat klien bertambah.", "Start free. Upgrade as your client work grows.")}</h2><p className="mt-5 text-lg text-slate-600">{tx("Tidak perlu kartu kredit untuk mulai.", "No credit card required.")}</p></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">{pricing.map(plan => <div key={plan.name} className={`relative flex flex-col rounded-3xl p-6 ${plan.featured ? "bg-[#292D34] text-white shadow-[0_24px_70px_rgba(41,45,52,.22)] lg:-translate-y-3" : "bg-[#FBFAFE] ring-1 ring-slate-200"}`}>{plan.featured && <span className="absolute right-5 top-5 rounded-full bg-[#FF7657] px-3 py-1 text-xs font-semibold">{tx("Paling populer", "Most popular")}</span>}<p className={`text-sm font-semibold ${plan.featured ? "text-violet-300" : "text-[#6647F0]"}`}>{tx(plan.name, plan.name === "Free" ? "Free" : plan.name)}</p><p className={`mt-3 text-sm ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>{plan.name === "Free" ? tx("Coba dulu untuk client work kecil.", "Try it for small client work.") : plan.name === "Solo" ? tx("Untuk freelancer yang mulai serius.", "For freelancers getting serious.") : tx("Untuk tim kecil yang kerja bareng.", "For small teams working together.")}</p><div className="mt-7"><strong className="block text-3xl tracking-[-.03em]">{getLandingPrice(plan.name.toLowerCase() as "free" | "solo" | "team", "monthly", currency)}</strong><span className={`mt-1 block text-xs ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>{plan.name === "Solo" || plan.name === "Team" ? `${getLandingPrice(plan.name.toLowerCase() as "solo" | "team", "yearly", currency)} / ${tx("tahun", "year")}` : tx("selamanya", "forever")}</span>{currency === "USD" && plan.name !== "Free" && <p className="mt-2 text-xs">{tx("Pembayaran diproses dalam IDR.", "Payment processed in IDR.")}</p>}</div><div className={`my-6 h-px ${plan.featured ? "bg-white/10" : "bg-slate-200"}`} /><div className="flex-1 space-y-3">{plan.items.map(item => <div key={item} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-slate-200" : "text-slate-700"}`}><Check className={`h-4 w-4 ${plan.featured ? "text-emerald-400" : "text-[#6647F0]"}`} />{tx(item, landingEn[item] ?? item)}</div>)}</div><Button asChild className={`mt-8 h-11 rounded-xl ${plan.featured ? "bg-white text-[#292D34] hover:bg-violet-50" : "bg-[#292D34] text-white hover:bg-[#17191E]"}`}><Link href="/signup">{tx(plan.cta, plan.name === "Free" ? "Start free" : `Choose ${plan.name}`)}<ArrowRight className="ml-1 inline h-4 w-4" /></Link></Button></div>)}</div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#6647F0] via-[#7456F4] to-[#FF7657] px-6 py-14 text-center text-white shadow-[0_30px_90px_rgba(102,71,240,.28)] sm:px-12 sm:py-16"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">{tx("Kerja klien, lebih rapi", "Cleaner client work")}</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-[-.035em] sm:text-5xl">{tx("Kerja klien nggak harus tercecer di banyak aplikasi.", "Client work does not have to be scattered across apps.")}</h2><p className="mx-auto mt-5 max-w-xl text-lg text-white/80">{tx("Mulai gratis. Rapikan satu klien hari ini.", "Start free. Organize one client today.")}</p><Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-white px-6 text-[#292D34] hover:bg-violet-50"><Link href="/signup">{tx("Buat workspace gratis", "Create free workspace")} <ArrowRight className="h-4 w-4" /></Link></Button></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-9 w-auto" /><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{tx("Client operations hub untuk freelancer, agency, dan tim jasa.", "Client operations hub for freelancers, agencies, and service teams.")}</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><a href="#workflow">{tx("Alur kerja", "Workflow")}</a><a href="#pricing">{tx("Harga", "Pricing")}</a><Link href="/terms">{tx("Syarat", "Terms")}</Link><Link href="/privacy">{tx("Privasi", "Privacy")}</Link><span>© 2026 Cubiqlo</span></div></div></footer>
    </div>
  );
}
