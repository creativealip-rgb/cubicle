import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const operationPillars = [
  {
    icon: Users,
    title: "Klien",
    description: "Simpan kontak, notes, project, akses portal, dan riwayat client di satu tempat.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Proyek",
    description: "Atur project, assign team, pantau progress, dan bikin status delivery tetap jelas.",
  },
  {
    icon: FolderOpen,
    title: "File & deliverable",
    description: "Pisahkan file internal dari deliverable yang siap dibagikan ke client.",
  },
  {
    icon: Clock3,
    title: "Time tracking",
    description: "Catat jam billable pakai timer, input manual, summary, dan export CSV.",
  },
  {
    icon: FileText,
    title: "Invoices",
    description: "Ubah kerja billable jadi invoice, bagikan link, dan catat pembayaran.",
  },
  {
    icon: MessageSquareText,
    title: "Client portal",
    description: "Kasih client satu link rapi untuk lihat project, task, file, komentar, dan invoice.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "Lihat appointment, deadline, dan jadwal kerja dari satu calendar.",
  },
  {
    icon: Sparkles,
    title: "AI assistant",
    description: "AI assistant yang paham data workspace: bikin prompt, summary, dan jawaban cepat.",
  },
];

const workflow = [
  "Tambah klien, scope, dan proyek",
  "Kelola task, file, komentar, dan waktu",
  "Bagikan portal, kirim invoice, terima bayaran",
];

const pricing = [
  {
    name: "Free",
    price: "Rp 0",
    priceSub: "selamanya",
    description: "Coba dulu, tanpa kartu kredit.",
    items: ["1 user", "3 clients", "Project & task", "Invoice", "Time tracking"],
    cta: "Mulai gratis",
    href: "/signup",
    featured: false,
  },
  {
    name: "Solo",
    price: "Rp 49rb",
    priceSub: "/bulan",
    description: "Untuk freelancer yang mulai serius kelola client work.",
    items: ["1 user", "Unlimited clients", "Client portal", "AI assistant", "Calendar & booking", "Proposal & contract"],
    cta: "Mulai Rp 49rb",
    href: "/signup",
    featured: true,
  },
  {
    name: "Team",
    price: "Rp 99rb",
    priceSub: "/bulan",
    description: "Untuk team kecil yang handle banyak client bareng.",
    items: ["5 users", "Unlimited clients", "Shared workspace", "Team roles", "File handoff", "Advanced report", "Priority support"],
    cta: "Mulai Team",
    href: "/signup",
    featured: false,
  },
];

export default function HomePage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-slate-950/5 bg-white/75 backdrop-blur-2xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" aria-label="Cubiqlo home" className="flex items-center gap-3">
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-11 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors duration-200 hover:text-[#6647F0]">Fitur</a>
            <a href="#workflow" className="transition-colors duration-200 hover:text-[#6647F0]">Alur</a>
            <a href="#portal" className="transition-colors duration-200 hover:text-[#6647F0]">Portal</a>
            <a href="#pricing" className="transition-colors duration-200 hover:text-[#6647F0]">Harga</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild className="bg-[#6647F0] text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#5333DD] hover:shadow-[0_8px_20px_rgba(102,71,240,0.25)] active:bg-[#4A2AD0] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#6647F0] focus-visible:ring-offset-2">
              <Link href="/signup">
                Mulai
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-screen overflow-hidden pt-16 bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.13),transparent_24%),linear-gradient(180deg,#fff_0%,#f8fafc_42%,#fff_100%)] text-slate-950">
      <section className="relative px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <div className="relative">
            <div className="absolute -left-10 -top-10 hidden h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl lg:block" />
            <div className="relative mb-6 inline-flex">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#0091ff,#ff02f0,#f76808,#6647f0,#0091ff)] opacity-70 blur-md"
              />
              <Badge className="relative rounded-full border-0 bg-white/90 px-3 py-1.5 text-[#6647F0] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] hover:bg-white/90">
                <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Versi beta · v0.1
              </Badge>
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-normal text-[#292D34] sm:text-5xl sm:tracking-normal md:text-6xl lg:text-7xl" style={{ fontWeight: 650 }}>
              Kelola kerja klien dari satu workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Cubiqlo bantu freelancer, agency, dan studio mengatur klien, proyek, tugas, file, waktu kerja, invoice, booking, dan portal klien tanpa pindah-pindah tool.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl bg-[#6647F0] px-6 text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#5333DD] hover:shadow-[0_8px_20px_rgba(102,71,240,0.25)] active:bg-[#4A2AD0] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#6647F0] focus-visible:ring-offset-2 tracking-[-0.01em] font-normal">
                <Link href="/signup">
                  Mulai gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border border-[#D9D9D9] bg-white px-6 text-[#292D34] shadow-[0_4px_4px_rgba(13,21,48,0.04)] hover:border-[#C0C0C0] hover:bg-[#F8F9FA] tracking-[-0.01em] font-normal">
                <Link href="/login">Masuk</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              {[
                "Portal klien tersedia",
                "Dari waktu kerja ke invoice",
                "Gratis mulai · tanpa kartu kredit",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6647F0]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-[0_40px_120px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 backdrop-blur-xl" style={{ transform: 'perspective(1200px) rotateX(2deg)' }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                  cubiqlo.com/app/dashboard
                </div>
              </div>
              {/* Real screenshot */}
              <div className="relative h-80 overflow-hidden lg:h-[420px]">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Cubiqlo dashboard showing active clients, projects, tasks, and invoices"
                  width={1440}
                  height={900}
                  priority
                  className="block w-full object-top"
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/90 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden border-y border-slate-200/60 px-4 py-20 sm:px-6 lg:px-8"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(102,71,240,0.10), transparent 55%), radial-gradient(ellipse at bottom right, rgba(0,145,255,0.08), transparent 55%), #FAFBFC',
        }}
      >
        {/* decorative soft blobs — very subtle on light */}
        <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-[#6647F0]/6 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-[#0091FF]/5 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border !border-[#A78BFA]/40 bg-white px-3 py-1.5 shadow-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#6647F0]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6647F0]">Kenapa Cubiqlo</p>
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.01em] text-[#292D34] sm:text-4xl lg:text-[2.75rem]">
              Project management berhenti di task. Cubiqlo lanjut sampai invoice.
            </h2>
          </div>
          <div className="relative">
            <p className="text-lg leading-8 text-slate-600">
              Tool PM biasa berhenti di task. Bisnis jasa masih butuh{' '}
              <span className="font-medium text-[#292D34]">client portal, deliverable, time tracking, booking, invoice</span>
              {' '}— plus cara rapi buat update client. Cubiqlo satukan semuanya dari hari pertama.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Portal', 'File', 'Waktu', 'Kalender', 'AI', 'Invoice'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border !border-[#6647F0]/25 bg-white px-3 py-1 text-xs font-medium text-[#6647F0] shadow-sm"
                >
                  <span className="inline-flex h-1 w-1 rounded-full bg-[#6647F0]" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats band — concrete numbers beat promises */}
      <section className="relative overflow-hidden border-y border-slate-950/5 bg-white px-4 py-14 sm:px-6 lg:px-8">
        {/* subtle decorative gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(102,71,240,0.04),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-3 gap-8 sm:gap-10">
          {[
            { value: "4h", label: "Hemat per minggu", accent: "#0091FF" },
            { value: "1", label: "Workspace, bukan 6 tool", accent: "#6647F0" },
            { value: "0", label: "Spreadsheet manual", accent: "#ED5F00" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`relative text-center ${i > 0 ? "sm:border-l sm:border-slate-200 sm:pl-10" : ""}`}
            >
              {/* accent dot */}
              <div className="mb-3 flex justify-center">
                <span
                  className="inline-block h-1 w-10 rounded-full"
                  style={{ backgroundColor: stat.accent }}
                />
              </div>
              <div className="text-4xl font-bold tracking-[-0.03em] text-[#292D34] sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-xs font-semibold uppercase leading-tight tracking-[0.15em] text-slate-700">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        {/* decorative bg blobs */}
        <div className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-[#6647F0]/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-20 h-72 w-72 rounded-full bg-[#0091FF]/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6647F0]/20 bg-[#F4F0FF] px-3 py-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#6647F0]" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6647F0]">Client Operations Hub</p>
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.01em] text-[#292D34] sm:text-5xl">
                Semua yang dibutuhkan untuk kirim hasil ke klien.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">Terhubung.</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-[#6647F0]/15"
                  />
                </span>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Kelola kerja berdasarkan client, bukan board yang tercecer. Cubiqlo simpan seluruh workflow: scope, task, file, time tracking, portal, dan billing.
              </p>
            </div>
            {/* inline mini-metric cluster */}
            <div className="grid grid-cols-3 gap-3 lg:justify-self-end">
              {[
                { label: 'Pillars', value: '8' },
                { label: 'Tahapan kerja', value: '10' },
                { label: 'Tool terganti', value: '7+' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="text-2xl font-bold tracking-[-0.02em] text-[#6647F0] sm:text-3xl">{m.value}</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.15em] text-slate-600">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {operationPillars.map((feature) => (
              <Card
                key={feature.title}
                className="group rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#6647F0]/25 hover:shadow-[0_8px_24px_rgba(102,71,240,0.12),0_24px_48px_rgba(0,0,0,0.08)]"
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F4F0FF] to-[#E8E0FF] text-[#6647F0] shadow-[0_2px_8px_rgba(102,71,240,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#6647F0] group-hover:to-[#5333DD] group-hover:text-white group-hover:shadow-[0_4px_16px_rgba(102,71,240,0.30)]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="tracking-[0.03em] text-lg font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja — 3 steps + 1 hero screenshot */}
      <section id="workflow" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">Cara kerja</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Dari request pertama sampai pembayaran.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Satu workspace. Tiga langkah. Tanpa lompat-lompat tool.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <ol className="space-y-8">
              {workflow.map((step, index) => (
                <li key={step} className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6647F0] text-lg font-semibold text-white shadow-md shadow-purple-900/40">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="tracking-[0.03em] text-xl font-semibold text-slate-950">{step}</h3>
                    <p className="mt-2 leading-7 text-slate-600">
                      {index === 0 && "Client, kontak, dan notes rapi dari awal."}
                      {index === 1 && "Task, file, waktu kerja, dan komentar tetap nyambung."}
                      {index === 2 && "Share portal, kirim invoice, lalu terima pembayaran."}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/15 via-cyan-400/8 to-indigo-500/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_8px_32px_rgba(13,21,48,0.08),0_24px_60px_rgba(13,21,48,0.06)]" style={{ transform: 'perspective(1200px) rotateY(-2deg)' }}>
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-100">
                    cubiqlo.com/app/dashboard
                  </div>
                </div>
                <div className="relative h-72 overflow-hidden bg-slate-100 lg:h-96">
                  <Image
                    src="/screenshots/tasks.png"
                    alt="Cubiqlo tasks with filters and priorities"
                    width={1440}
                    height={900}
                    priority
                    className="block w-full"
                    style={{ objectFit: 'cover', objectPosition: 'top' }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="portal" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_58%,#06b6d4_130%)] p-8 text-white shadow-[0_8px_32px_rgba(29,78,216,0.20),0_24px_60px_rgba(13,21,48,0.12)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-lg font-semibold">Client Portal</p>
                  <p className="text-sm text-blue-100/75">cubiqlo.com/client-portal/acme</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-6 grid gap-4">
                {[
                  [LayoutDashboard, "Status project", "In progress · 68%"],
                  [FolderOpen, "Deliverable", "3 file terlihat oleh client"],
                  [MessageSquareText, "Update", "2 komentar baru"],
                  [FileText, "Invoice", "INV-2026-004 siap dikirim"],
                ].map(([Icon, title, meta]) => {
                  const PortalIcon = Icon as typeof LayoutDashboard;
                  return (
                    <div key={title as string} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <PortalIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{title as string}</p>
                        <p className="text-xs text-blue-100/75">{meta as string}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          <div>
            <Badge className="mb-4 bg-[#F4F0FF] text-[#6647F0] hover:bg-[#F4F0FF]">Client portal tersedia</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Satu link. Kurangi follow-up bolak-balik.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Bagikan hanya yang perlu client lihat: progress project, task terpilih, file deliverable, komentar publik, dan link invoice. Kerjaan internal tetap aman.
            </p>
            <div className="mt-7 grid gap-3 text-slate-700 sm:grid-cols-2">
              {["Project terlihat", "File deliverable", "Komentar client", "Link invoice", "Token portal", "Data internal aman"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6647F0]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="built-for" className="border-y border-slate-950/5 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Built for
          </p>
          <p className="text-lg leading-8 text-slate-700 sm:text-xl">
            Freelancer · Creative agency · Software studio · Marketing team · Konsultan
          </p>
        </div>
      </section>

      {/* Comparison row — Cubiqlo vs category leaders */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Kenapa pindah</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Kurangi tool. Kurangi biaya operasional.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Tool client ops global sering mulai dari sekitar $17–$19 per bulan dan masih butuh add-on untuk workflow tertentu. Cubiqlo kasih free workspace, portal klien, dan billing IDR sejak awal.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_16px_rgba(13,21,48,0.04),0_16px_48px_rgba(13,21,48,0.08)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium"></th>
                  <th className="px-6 py-4 font-medium">HoneyBook</th>
                  <th className="px-6 py-4 font-medium">Bonsai</th>
                  <th className="px-6 py-4 font-medium text-[#6647F0]">Cubiqlo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: "Harga mulai", h: "$19/mo", b: "$17/mo", c: "Gratis" },
                  { label: "Client portal included", h: "Ada", b: "Add-on", c: "Ada" },
                  { label: "Booking page included", h: "Ada", b: "Add-on", c: "Ada" },
                  { label: "Native IDR billing", h: "Integrasi", b: "Integrasi", c: "Ada" },
                  { label: "Waktu setup", h: "1–2 jam", b: "1–2 jam", c: "5 menit" },
                  { label: "AI assistant", h: "—", b: "—", c: "Sudah termasuk" },
                  { label: "Calendar view", h: "—", b: "Add-on", c: "Ada" },
                ].map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                    <td className="px-6 py-4 text-slate-500">{row.h}</td>
                    <td className="px-6 py-4 text-slate-500">{row.b}</td>
                    <td className="px-6 py-4 font-semibold text-[#6647F0]">{row.c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                quote: "Cubiqlo nyambungin kerjaan client sampai invoice. Biasanya gue buang 3 jam seminggu cuma buat pindah-pindah konteks.",
                author: "Rina W.",
                role: "Freelance brand designer",
              },
              {
                quote: "Client portal-nya aja sudah ganti dua tool di workflow kami. Client sekarang cek progress sendiri, bukan nanya terus di WhatsApp.",
                author: "Andika P.",
                role: "Studio owner, team 4 orang",
              },
              {
                quote: "Time tracking yang langsung nyambung ke invoice ternyata fitur yang kami butuhkan. Closing bulanan turun dari 2 hari jadi 4 jam.",
                author: "Maya S.",
                role: "Marketing consultant",
              },
            ].map((t) => (
              <Card key={t.author} className="group rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#6647F0]/20 hover:shadow-[0_8px_24px_rgba(102,71,240,0.10),0_20px_40px_rgba(0,0,0,0.08)]">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4F0FF]">
                    <span className="text-lg font-bold text-[#6647F0]">&ldquo;</span>
                  </div>
                  <p className="text-sm leading-7 text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6647F0] to-[#0091FF] text-xs font-semibold text-white">
                      {t.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{t.author}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            <span>Diuji 12 tim jasa</span>
            <span aria-hidden="true">·</span>
            <span>Freelancer + studio kecil</span>
            <span aria-hidden="true">·</span>
            <span>Billing IDR + USD</span>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[linear-gradient(180deg,#f8fafc_0%,#fff_100%)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 bg-white">Harga transparan</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Mulai gratis. Upgrade saat butuh lebih banyak client.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Mulai dari free workspace. Naik plan saat client dan team makin banyak.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div key={plan.name} className={`relative ${plan.featured ? 'z-10 scale-[1.03]' : ''}`}>
                {plan.featured && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -inset-[1px] rounded-2xl bg-[conic-gradient(from_140deg,#0091ff,#ff02f0,#f76808,#6647f0,#0091ff)] opacity-90"
                    />
                    <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#6647F0] to-[#0091FF] px-4 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(102,71,240,0.30)]">
                      Paling Populer
                    </span>
                  </>
                )}
                <Card
                  className={
                    plan.featured
                      ? "relative rounded-2xl border-0 bg-white shadow-[0_24px_60px_rgba(37,99,235,0.18)]"
                      : "group rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#6647F0]/20 hover:shadow-[0_8px_24px_rgba(102,71,240,0.10),0_20px_40px_rgba(0,0,0,0.08)]"
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold tracking-[0.03em] text-slate-950">{plan.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-semibold tracking-[0.03em] ${plan.featured ? "text-[#6647F0]" : "text-[#292D34]"}`}>{plan.price}</div>
                        {plan.priceSub && <p className="text-xs text-slate-500 mt-0.5">{plan.priceSub}</p>}
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      {plan.items.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-[#6647F0]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      asChild
                      className={
                        plan.featured
                          ? "mt-7 w-full rounded-xl bg-[#6647F0] text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#5333DD] hover:shadow-[0_8px_20px_rgba(102,71,240,0.25)] active:bg-[#4A2AD0] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#6647F0] focus-visible:ring-offset-2 tracking-[-0.01em] font-normal"
                          : "mt-7 w-full rounded-xl border-[1.5px] border-[#292D34] bg-white text-[#292D34] shadow-[0_2px_4px_rgba(13,21,48,0.04)] hover:bg-[#292D34] hover:text-white hover:shadow-[0_4px_12px_rgba(41,45,52,0.15)] tracking-[-0.01em] font-normal transition-all duration-200"
                      }
                      variant={plan.featured ? "default" : "outline"}
                    >
                      <Link href={plan.href}>
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 bg-white">FAQ</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] text-[#292D34] sm:text-4xl">Pertanyaan sebelum mulai</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              ["Apakah Free benar gratis?", "Ya. Free bisa dipakai untuk mulai rapi tanpa kartu kredit."],
              ["Bisa pakai Rupiah?", "Bisa. Cubiqlo disiapkan untuk invoice dan operasional bisnis jasa Indonesia."],
              ["Client bisa lihat semua data?", "Tidak. Portal hanya menampilkan item yang kamu pilih. Data internal tetap aman."],
              ["Cocok untuk freelancer?", "Cocok. Solo plan fokus untuk freelancer yang handle banyak klien sendiri."],
              ["Cocok untuk team kecil?", "Cocok. Team plan punya shared workspace, role, file handoff, dan report."],
              ["Bisa upgrade nanti?", "Bisa. Mulai Free dulu, upgrade saat jumlah klien atau team sudah butuh."],
            ].map(([q, a]) => (
              <Card key={q} className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)]">
                <CardContent className="p-6">
                  <h3 className="text-base font-semibold text-slate-950">{q}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA with subtle background pattern */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(37,99,235,0.18) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-5xl rounded-[2rem] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_58%,#06b6d4_130%)] px-6 py-14 text-center text-white shadow-2xl shadow-slate-300/70 sm:px-12">
          <Sparkles className="mx-auto h-8 w-8 text-[#B19EE8]" />
          <h2 className="mt-5 text-3xl font-semibold tracking-[0.03em] text-white sm:text-5xl">
            Satukan semua client work di satu workspace.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/90">
            Ganti update yang tercecer, jam billable yang lupa dicatat, dan handoff manual dengan satu client operations hub.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl bg-white px-6 text-[#292D34] shadow-[0_4px_4px_rgba(13,21,48,0.04)] tracking-[-0.01em] hover:bg-[#F8F9FA] font-normal">
              <Link href="/signup">
                Buat workspace gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border border-white/30 bg-white/10 px-6 text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] tracking-[-0.01em] hover:bg-white/20 hover:text-white font-normal">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <Image src="/logo-header.png" alt="Cubiqlo" width={160} height={54} className="h-9 w-auto object-contain" />
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Workspace untuk kelola kerja klien dari request pertama sampai invoice.</p>
            <p className="mt-3 text-sm text-slate-500">support@cubiqlo.com</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Produk</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
              <a href="#features" className="hover:text-[#6647F0]">Fitur</a>
              <a href="#workflow" className="hover:text-[#6647F0]">Alur kerja</a>
              <a href="#pricing" className="hover:text-[#6647F0]">Harga</a>
              <Link href="/signup" className="hover:text-[#6647F0]">Daftar</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Legal</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
              <Link href="/login" className="hover:text-[#6647F0]">Masuk</Link>
              <Link href="/terms" className="hover:text-[#6647F0]">Syarat</Link>
              <Link href="/privacy" className="hover:text-[#6647F0]">Privasi</Link>
              <span>© 2026 Cubiqlo</span>
            </div>
          </div>
        </div>
      </footer>
      </main>
    </>
  );
}
