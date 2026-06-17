import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  SquareStack,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const operationPillars = [
  {
    icon: Users,
    title: "Client CRM",
    description: "Keep contacts, notes, projects, portal access, and client history in one place.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Project delivery",
    description: "Plan projects, track tasks, assign work, and keep delivery status clear.",
  },
  {
    icon: FolderOpen,
    title: "Files & deliverables",
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
];

const workflow = [
  "Add client, scope, and project",
  "Manage tasks, files, comments, and time",
  "Share portal, send invoice, get paid",
];

const pricing = [
  {
    name: "Solo",
    price: "Free",
    priceSub: "during beta",
    description: "For freelancers running client work alone.",
    items: ["Clients & projects", "Time tracking", "Invoices", "Client portal"],
    cta: "Start free",
    href: "/signup",
    featured: true,
  },
  {
    name: "Team",
    price: "Soon",
    description: "For small teams that deliver client projects together.",
    items: ["Team roles", "Shared workspace", "File handoff", "Booking pages"],
    cta: "Join waitlist",
    href: "/signup",
    featured: false,
  },
  {
    name: "Studio",
    price: "Custom",
    description: "For agencies that need a branded client operation hub.",
    items: ["White-label portal", "Priority support", "Advanced setup", "Custom workflow"],
    cta: "Talk to us",
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
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_35%)]" />
              <SquareStack className="relative h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Cubicle</p>
              <p className="text-xs text-slate-500">Client Operations Hub</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-950">Features</a>
            <a href="#workflow" className="transition hover:text-slate-950">Workflow</a>
            <a href="#portal" className="transition hover:text-slate-950">Portal</a>
            <a href="#pricing" className="transition hover:text-slate-950">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/signup">
                Get started
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
            <Badge className="mb-6 border border-blue-200/70 bg-white/70 px-3 py-1.5 text-blue-700 shadow-sm shadow-blue-100/60 backdrop-blur hover:bg-white/70">
              <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live in beta · v0.1
            </Badge>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl sm:tracking-normal md:text-6xl lg:text-7xl">
              Run client work from request to invoice.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              One calm workspace for clients, projects, deliverables, time, invoices, booking, and portals.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-blue-600 px-6 text-white hover:bg-blue-700">
                <Link href="/signup">
                  Start managing clients
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 bg-white/70 px-6">
                <Link href="/login">View demo workspace</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              {[
                "Client portal included",
                "Time-to-invoice workflow",
                "No scattered handoffs",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-[0_40px_120px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 backdrop-blur-xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                  cubicle.app/app/dashboard
                </div>
              </div>
              {/* Real screenshot */}
              <Image
                src="/screenshots/dashboard.png"
                alt="Cubicle dashboard showing active clients, projects, tasks, and invoices"
                width={1440}
                height={900}
                priority
                className="block w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,#1e40af_0%,#2563eb_52%,#0ea5e9_120%)] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent to-blue-700/20" />
        <div className="pointer-events-none absolute inset-x-0 -bottom-16 h-16 bg-gradient-to-b from-blue-700/20 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Why Cubicle</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[0.03em] sm:text-4xl">
              Project management stops at tasks. Cubicle keeps going.
            </h2>
          </div>
          <p className="text-lg leading-8 text-blue-100">
            Generic project tools stop at tasks. Client-service businesses still need portals, deliverables, tracked time, booking, invoices, and a clean way to keep clients updated. Cubicle connects those pieces from day one.
          </p>
        </div>
      </section>

      {/* Stats band — concrete numbers beat promises */}
      <section className="border-y border-slate-950/5 bg-white/70 px-4 py-10 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { value: "12", label: "Service teams in beta" },
            { value: "4h", label: "Saved per weekly close" },
            { value: "1", label: "Workspace, not 6" },
            { value: "0", label: "Spreadsheets to keep updated" },
          ].map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <div className="text-3xl font-semibold tracking-[0.03em] text-slate-950 sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4">Client Operations Hub</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Everything around client delivery, connected.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Manage work around clients, not scattered boards. Cubicle keeps the full delivery loop close: scope, tasks, files, time, portal, and billing.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {operationPillars.map((feature) => (
              <Card key={feature.title} className="group border-slate-950/5 bg-white/75 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
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

      {/* How it works — 3 steps + 1 hero screenshot */}
      <section id="workflow" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              From first request to final payment.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              One workspace, not six. Three steps.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <ol className="space-y-8">
              {workflow.map((step, index) => (
                <li key={step} className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white shadow-md shadow-blue-200">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="tracking-[0.03em] text-xl font-semibold text-slate-950">{step}</h3>
                    <p className="mt-2 leading-7 text-slate-600">
                      {index === 0 && "Start with the client context, then keep every project, contact, and note attached to it."}
                      {index === 1 && "Run daily delivery without losing files, comments, billable time, or team ownership."}
                      {index === 2 && "Give clients a clean portal, share invoice links, and close the loop without rebuilding admin work."}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/15 via-cyan-400/8 to-indigo-500/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                    cubicle.app/app/dashboard
                  </div>
                </div>
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Cubicle dashboard with KPIs and active projects"
                  width={1440}
                  height={900}
                  className="block w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="portal" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="rounded-[2rem] border bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_58%,#06b6d4_130%)] p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="font-semibold">Client Portal</p>
                  <p className="text-sm text-blue-100/75">portal.cubicle/client/acme</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  [LayoutDashboard, "Project status", "In progress · 68%"],
                  [FolderOpen, "Deliverables", "3 client-visible files"],
                  [MessageSquareText, "Updates", "2 new comments"],
                  [FileText, "Invoice", "INV-2026-004 ready"],
                ].map(([Icon, title, meta]) => {
                  const PortalIcon = Icon as typeof LayoutDashboard;
                  return (
                    <div key={title as string} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
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
          </div>

          <div>
            <Badge className="mb-4 bg-blue-50 text-blue-700 hover:bg-blue-50">Client portal included</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              One link. Less chasing.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Share only what clients should see: project progress, selected tasks, deliverable files, public comments, and invoice links. Internal work stays internal.
            </p>
            <div className="mt-7 grid gap-3 text-slate-700 sm:grid-cols-2">
              {["Visible projects", "Deliverable files", "Client comments", "Invoice links", "Portal tokens", "Internal data hidden"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
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
            Freelancers · Creative agencies · Software studios · Marketing teams · Consultants
          </p>
        </div>
      </section>

      {/* Comparison row — Cubicle vs category leaders */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Why switch</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Less tool sprawl. Less spend.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Other client-ops tools charge $20–$52/month per seat and still miss the portal or booking. Cubicle keeps the full loop free for solo work.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium"></th>
                  <th className="px-6 py-4 font-medium">HoneyBook</th>
                  <th className="px-6 py-4 font-medium">Bonsai</th>
                  <th className="px-6 py-4 font-medium text-blue-700">Cubicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: "Solo entry price", h: "$19/mo", b: "$17/mo", c: "Free" },
                  { label: "Client portal included", h: "Yes", b: "Add-on", c: "Yes" },
                  { label: "Booking pages", h: "Yes", b: "Add-on", c: "Yes" },
                  { label: "Native IDR billing", h: "—", b: "—", c: "Yes" },
                  { label: "Setup time", h: "1–2 hours", b: "1–2 hours", c: "5 minutes" },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                    <td className="px-6 py-4 text-slate-500">{row.h}</td>
                    <td className="px-6 py-4 text-slate-500">{row.b}</td>
                    <td className="px-6 py-4 font-semibold text-blue-700">{row.c}</td>
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
                quote: "Cubicle closed the loop between my client work and my invoicing. I used to lose 3 hours a week to context-switching.",
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
              <Card key={t.author} className="border-slate-200 bg-white">
                <CardContent className="p-6">
                  <p className="text-sm leading-7 text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-semibold text-slate-950">{t.author}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
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
            <Badge variant="outline" className="mb-4 bg-white">MVP beta</Badge>
            <h2 className="text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
              Beta access for serious client-service teams.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Start with the core client operations workflow. Scale into team roles, branded portals, and studio-level support when ready.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {pricing.map((plan) => (
              <Card key={plan.name} className={plan.featured ? "border-blue-200 bg-white shadow-xl shadow-blue-100/70" : "border-slate-200 bg-white"}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-[0.03em] text-slate-950">{plan.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-semibold tracking-[0.03em] ${plan.featured ? "text-blue-700" : "text-slate-950"}`}>{plan.price}</div>
                      {plan.priceSub && <p className="text-xs text-slate-500 mt-0.5">{plan.priceSub}</p>}
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className={plan.featured ? "mt-7 w-full bg-blue-600 text-white hover:bg-blue-700" : "mt-7 w-full"} variant={plan.featured ? "default" : "outline"}>
                    <Link href={plan.href}>
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
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
          <Sparkles className="mx-auto h-8 w-8 text-blue-300" />
          <h2 className="mt-5 text-3xl font-semibold tracking-[0.03em] sm:text-5xl">
            Bring every client workspace under one roof.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Replace scattered updates, forgotten billable hours, and manual handoffs with one client operations hub.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-white px-6 text-blue-700 hover:bg-blue-50">
              <Link href="/signup">
                Create workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-white/10 px-6 text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_35%)]" />
              <SquareStack className="relative h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cubicle</p>
              <p className="text-xs text-slate-500">Manage client work from request to invoice.</p>
            </div>
          </div>
          <div className="flex gap-5 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-950">Login</Link>
            <Link href="/signup" className="hover:text-slate-950">Signup</Link>
            <a href="#features" className="hover:text-slate-950">Features</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
