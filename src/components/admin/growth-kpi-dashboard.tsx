import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { comparePercent, type GrowthRange } from "@/lib/admin-growth-metrics";
import type { GrowthDashboard } from "@/lib/actions/admin/dashboard";

const ranges: GrowthRange[] = ["7d", "30d", "90d", "12m"];
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const money = (value: number | null) => value == null ? "—" : `Rp${number.format(value)}`;

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Minus className="size-3" />No prior baseline</span>;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}><Icon className="size-3" />{positive ? "+" : ""}{value}%</span>;
}

function HeroMetric({ label, value, delta, help, accent = false }: { label: string; value: string | number; delta?: number | null; help: string; accent?: boolean }) {
  return <div className={`min-w-0 border-r border-slate-200 px-4 py-3 last:border-r-0 ${accent ? "bg-violet-50/70" : "bg-white"}`} title={help}>
    <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-1.5"><p className="truncate text-xl font-bold tabular-nums text-slate-900">{value}</p>{delta !== undefined && <Delta value={delta} />}</div>
  </div>;
}

function Metric({ label, value, help, unavailable = false }: { label: string; value: string | number; help: string; unavailable?: boolean }) {
  return <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0" title={help}>
    <span className="text-xs text-slate-600">{label}</span>
    <span className={`shrink-0 text-right text-sm tabular-nums ${unavailable ? "font-normal text-slate-400" : "font-semibold text-slate-900"}`}>{value}</span>
  </div>;
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
    <div className="mb-1"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="text-[11px] text-slate-500">{description}</p></div>
    <div>{children}</div>
  </section>;
}

export function GrowthKpiDashboard({ data }: { data: GrowthDashboard }) {
  const activationRate = data.signups ? Math.round(data.activated / data.signups * 1000) / 10 : null;
  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Growth dashboard</h1><p className="mt-0.5 text-xs text-slate-500">Workspace funnel · Updated {new Date(data.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></div>
      <nav aria-label="Date range" className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-xs">{ranges.map(range => <a key={range} href={`/dashboard?range=${range}`} className={`rounded-md px-3 py-1.5 text-xs font-medium ${data.range === range ? "bg-[#6647F0] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{range}</a>)}</nav>
    </header>

    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs"><div className="grid grid-cols-2 lg:grid-cols-5">
      <HeroMetric label="Signups" value={number.format(data.signups)} delta={comparePercent(data.signups, data.previous.signups)} help="Users created inside selected range" />
      <HeroMetric label="Activated" value={number.format(data.activated)} delta={comparePercent(data.activated, data.previous.activated)} help="Workspaces reaching client + project + meaningful activity" />
      <HeroMetric label="Current paid" value={number.format(data.paidAccounts)} help="Current active paid owner plans; not a selected-range cohort" />
      <HeroMetric label="MRR" value={money(data.mrr)} help="Current active owner plan baseline; annual plans divided by 12" accent />
      <HeroMetric label="ARR" value={money(data.arr)} help="MRR multiplied by 12" accent />
    </div></div>

    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Activation funnel</h2><p className="text-[11px] text-slate-500">New users in selected period reaching first value</p></div><span className="text-sm font-semibold tabular-nums text-[#6647F0]">{activationRate == null ? "—" : `${activationRate}%`}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#6647F0]" style={{ width: `${Math.min(activationRate ?? 0, 100)}%` }} /></div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{number.format(data.signups)} signups</span><span>{number.format(data.activated)} activated</span></div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Product usage" description="Meaningful activity during selected period">
        <Metric label="Active workspaces" value={number.format(data.activeWorkspaces)} help="Workspaces with meaningful activity" />
        <Metric label="Active users" value={number.format(data.activeUsers)} help="Users creating projects, tasks, or time entries" />
        <Metric label="Projects created" value={number.format(data.projects)} help="Projects created in range" />
        <Metric label="Tasks created" value={number.format(data.tasks)} help="Tasks created in range" />
        <Metric label="Time tracking adoption" value={`${number.format(data.timeTrackingWorkspaces)} workspaces`} help="Workspaces with time entries" />
        <Metric label="Portal usage" value={`${number.format(data.portalWorkspaces)} workspaces`} help="Workspaces with portal visits" />
      </Panel>
      <Panel title="Revenue" description="Current recurring baseline and payment activity">
        <Metric label="Current paid accounts" value={number.format(data.paidAccounts)} help="Owners with active paid plan" />
        <Metric label="MRR" value={money(data.mrr)} help="Monthly recurring equivalent" />
        <Metric label="ARR" value={money(data.arr)} help="MRR × 12" />
        <Metric label="ARPU" value={money(data.arpu)} help="MRR divided by paid accounts" />
        <Metric label="Completed plan payments" value={number.format(data.completedPayments)} help="All completed plan payment records" />
      </Panel>
      <Panel title="Acquisition" description="Selected period, real event data">
        <Metric label="Visitors" value={number.format(data.visitors)} help="Unique tracked visitors" />
        <Metric label="Organic visitors" value={number.format(data.organic)} help="Visitors without campaign attribution" />
        <Metric label="Referrals" value={number.format(data.referrals)} help="Visitors with referral attribution" />
        <Metric label="Signup starts" value={number.format(data.signupStarts)} help="Tracked signup interactions" />
        <Metric label="Signup completions" value={number.format(data.signupCompletions)} help="Successful account creation events" />
        <Metric label="Marketing spend" value={money(data.spend)} help="Recorded IDR spend" />
        <Metric label="Cost / signup" value={money(data.cps)} help="Spend divided by signup starts" />
        <Metric label="CAC" value={money(data.cac)} help="Spend divided by completed signups" />
      </Panel>
      <Panel title="Retention & growth" description="Requires historical entitlement transitions">
        <Metric label="Paid retention" value="Not tracked" unavailable help="Requires entitlement history" />
        <Metric label="Churn" value="Not tracked" unavailable help="Requires entitlement history" />
        <Metric label="Reactivation" value="Not tracked" unavailable help="Requires payment state transitions" />
        <Metric label="Net paid growth" value="Not tracked" unavailable help="Requires paid account state transitions" />
      </Panel>
    </div>
  </div>;
}

export default GrowthKpiDashboard;
