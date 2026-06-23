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
    description: "Keep contacts, notes, projects, portal access, and client history in one place.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Proyek",
    description: "Plan projects, assign teams, track progress, and keep delivery status clear.",
  },
  {
    icon: FolderOpen,
    title: "File & deliverable",
    description: "Separate internal files from client-visible deliverables ready for handoff.",
  },
  {
    icon: Clock3,
    title: "Time tracking",
    description: "Track billable work with timers, manual entries, summaries, and CSV exports.",
  },
  {
    icon: FileText,
    title: "Invoices",
    description: "Turn billable work into invoices, share public links, and record payments.",
  },
  {
    icon: MessageSquareText,
    title: "Client portal",
    description: "Give clients one clean link for shared projects, tasks, files, comments, and invoices.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "View upcoming appointments, deadlines, and scheduled work in one place.",
  },
  {
    icon: Sparkles,
    title: "AI assistant",
    description: "Built-in AI that understands your workspace data — generate prompts, summaries, and answers.",
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
    items: ["1 user", "3 clients", "Proyek & task", "Invoices", "Time tracking"],
    cta: "Start free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Solo",
    price: "Rp 49rb",
    priceSub: "/bulan",
    description: "Untuk freelancer yang serius kelola klien.",
    items: ["1 user", "Unlimited clients", "Client portal", "AI assistant", "Calendar & booking", "Proposals & contracts"],
    cta: "Mulai Rp 49rb",
    href: "/signup",
    featured: true,
  },
  {
    name: "Team",
    price: "Rp 99rb",
    priceSub: "/bulan",
    description: "Untuk tim kecil yang deliver bareng.",
    items: ["5 users", "Shared workspace", "Team roles", "File handoff", "Advanced reporting", "Priority support"],
    cta: "Mulai Team",
    href: "/signup",
    featured: false,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.13),transparent_24%),linear-gradient(180deg,#fff_0%,#f8fafc_42%,#fff_100%)] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-950/5 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/icon-192.png" alt="Cubiqlo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <p className="text-sm font-semibold leading-none">Cubiqlo</p>
              <p className="text-xs text-slate-500">Client Operations Hub</p>
            </div>
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
              Kelola klien dari awal sampai invoice.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Satu workspace untuk klien, proyek, file, waktu, invoice, booking, dan portal.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl bg-[#6647F0] px-6 text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#5333DD] hover:shadow-[0_8px_20px_rgba(102,71,240,0.25)] active:bg-[#4A2AD0] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#6647F0] focus-visible:ring-offset-2 tracking-[-0.01em] font-normal">
                <Link href="/signup">
                  Mulai kelola klien
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
                "Alur kerja dari waktu ke invoice",
                "Semua terpusat di satu tempat",
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
              Project management berhenti di task.{' '}
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#6647F0] to-[#0091FF] bg-clip-text text-transparent">
                Cubiqlo terus sampai selesai.
              </span>
            </h2>
          </div>
          <div className="relative">
            <p className="text-lg leading-8 text-slate-600">
              Tool PM biasa berhenti di task. Bisnis jasa masih butuh{' '}
              <span className="font-medium text-[#292D34]">portals, deliverables, tracked time, booking, invoices</span>
              {' '}— dan cara rapi untuk update klien. Cubiqlo hubungkan semua dari hari pertama.
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
            { value: "4h", label: "Jam hemat per minggu", accent: "#0091FF" },
            { value: "1", label: "Workspace, bukan 6", accent: "#6647F0" },
            { value: "0", label: "Spreadsheet yang harus diupdate", accent: "#ED5F00" },
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
                Semua yang dibutuhkan untuk delivery klien. Terhubung.
                <span className="relative inline-block">
                  <span className="relative z-10">Connected.</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-[#6647F0]/15"
                  />
                </span>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Kelola kerja berdasarkan klien, bukan board tersebar. Cubiqlo simpan seluruh alur delivery: scope, task, file, waktu, portal, dan billing.
              </p>
            </div>
            {/* inline mini-metric cluster */}
            <div className="grid grid-cols-3 gap-3 lg:justify-self-end">
              {[
                { label: 'Pillars', value: '8' },
                { label: 'Loop stages', value: '10' },
                { label: 'Tools replaced', value: '7+' },
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
              Dari permintaan pertama sampai pembayaran.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Satu workspace, bukan enam. Tiga langkah.
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
                      {index === 0 && "Clients, contacts, and notes — all in one place."}
                      {index === 1 && "Tasks, files, time, and comments — nothing falls through the cracks."}
                      {index === 2 && "Share a portal, send invoices, get paid."}
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
                  [LayoutDashboard, "Project status", "In progress · 68%"],
                  [FolderOpen, "Deliverables", "3 client-visible files"],
                  [MessageSquareText, "Updates", "2 new comments"],
                  [FileText, "Invoice", "INV-2026-004 ready"],
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
            <Badge className="mb-4 bg-[#F4F0FF] text-[#6647F0] hover:bg-[#F4F0FF]">Portal klien tersedia</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Satu link. Kurangin kejar-kejaran.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Bagikan hanya yang perlu klien lihat: progress proyek, task terpilih, file deliverable, komentar publik, dan link invoice. Kerjaan internal tetap internal.
            </p>
            <div className="mt-7 grid gap-3 text-slate-700 sm:grid-cols-2">
              {["Proyek terlihat", "File deliverable", "Komentar klien", "Link invoice", "Token portal", "Data internal tersembunyi"].map((item) => (
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
            Freelancer · Agency kreatif · Studio software · Tim marketing · Konsultan
          </p>
        </div>
      </section>

      {/* Comparison row — Cubiqlo vs category leaders */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Kenapa pindah</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Kurangi tool. Kurangi biaya.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Tool client-ops lain charge $20–$52/bulan per seat dan masih kurang portal atau booking. Cubiqlo tetap gratis untuk kerja solo.
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
                  { label: "Harga masuk", h: "$19/mo", b: "$17/mo", c: "Free" },
                  { label: "Portal klien tersedia", h: "Yes", b: "Add-on", c: "Yes" },
                  { label: "Halaman booking", h: "Yes", b: "Add-on", c: "Yes" },
                  { label: "Billing IDR", h: "—", b: "—", c: "Yes" },
                  { label: "Waktu setup", h: "1–2 hours", b: "1–2 hours", c: "5 menit" },
                  { label: "AI assistant", h: "—", b: "—", c: "Built-in" },
                  { label: "Calendar view", h: "—", b: "Add-on", c: "Yes" },
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
                quote: "Cubiqlo closed the loop between my client work and my invoicing. I used to lose 3 hours a week to context-switching.",
                author: "Rina W.",
                role: "Freelance brand designer",
              },
              {
                quote: "The client portal alone replaced two tools for us. Clients actually log in to check progress now instead of asking on WhatsApp.",
                author: "Andika P.",
                role: "Studio owner, 4-person team",
              },
              {
                quote: "Time tracking that feeds straight into the invoice is the thing I did not know I needed. Saved our monthly close from 2 days to 4 hours.",
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
            <span>Beta-tested by 12 service teams</span>
            <span aria-hidden="true">·</span>
            <span>Solo freelancers + small studios</span>
            <span aria-hidden="true">·</span>
            <span>IDR + USD billing</span>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[linear-gradient(180deg,#f8fafc_0%,#fff_100%)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 bg-white">Harga transparan</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Mulai gratis, upgrade kapan saja.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Bayar sesuai kebutuhan. Tidak ada kontrak, tidak ada biaya tersembunyi.
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
            Satukan semua workspace klien di satu tempat.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/90">
            Replace scattered updates, forgotten billable hours, and manual handoffs with one client operations hub.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl bg-white px-6 text-[#292D34] shadow-[0_4px_4px_rgba(13,21,48,0.04)] tracking-[-0.01em] hover:bg-[#F8F9FA] font-normal">
              <Link href="/signup">
                Buat workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border border-white/30 bg-white/10 px-6 text-white shadow-[0_4px_4px_rgba(13,21,48,0.04)] tracking-[-0.01em] hover:bg-white/20 hover:text-white font-normal">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="Cubiqlo" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-semibold">Cubiqlo</p>
              <p className="text-xs text-slate-500">Manage client work from request to invoice.</p>
            </div>
          </div>
          <div className="flex gap-5 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-950">Masuk</Link>
            <Link href="/signup" className="hover:text-slate-950">Daftar</Link>
            <a href="#features" className="hover:text-slate-950">Features</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
