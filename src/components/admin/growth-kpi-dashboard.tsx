import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, Minus } from "lucide-react";
import { comparePercent, type GrowthRange } from "@/lib/admin-growth-metrics";
import type { GrowthDashboard } from "@/lib/actions/admin/dashboard";

const ranges: GrowthRange[] = ["7d", "30d", "90d", "12m"];
const views = ["overview", "acquisition", "usage", "product", "revenue", "retention"] as const;
type View = (typeof views)[number];
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const money = (value: number | null) => value == null ? "—" : `Rp${number.format(value)}`;
const percent = (value: number | null) => value == null ? "—" : `${number.format(value)}%`;
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Minus className="size-3" />Belum ada baseline</span>;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}><Icon className="size-3" />{positive ? "+" : ""}{value}%</span>;
}

function Stat({ label, value, help, delta, accent = false, muted = false }: { label: string; value: string | number; help?: string; delta?: number | null; accent?: boolean; muted?: boolean }) {
  return <div className={`min-w-0 rounded-xl border p-4 ${accent ? "border-violet-200 bg-violet-50/70" : "border-slate-200 bg-white"}`} title={help}>
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2"><p className={`text-xl font-bold tabular-nums ${muted ? "text-slate-400" : "text-slate-900"}`}>{value}</p>{delta !== undefined && <Delta value={delta} />}</div>
    {help && <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>}
  </div>;
}

function Panel({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs ${className}`}>
    <div className="mb-4"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{children}
  </section>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-5 py-6 text-center"><Clock3 className="mb-2 size-5 text-slate-400" /><p className="text-sm font-medium text-slate-700">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{detail}</p></div>;
}

function MetricRows({ rows }: { rows: Array<{ label: string; value: string | number; note?: string }> }) {
  return <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">{rows.map(row => <div key={row.label} className="bg-white p-3"><p className="text-xs text-slate-500">{row.label}</p><p className="mt-1 text-base font-semibold tabular-nums text-slate-900">{row.value}</p>{row.note && <p className="mt-1 text-xs leading-5 text-slate-500">{row.note}</p>}</div>)}</div>;
}

function hasTrend(data: GrowthDashboard) { return data.trends.filter(x => x.visitors || x.signupCompletions || x.activated || x.revenue).length >= 2; }

function TrafficTrend({ data }: { data: GrowthDashboard }) {
  if (!hasTrend(data)) return <Empty title="Belum cukup data untuk trend" detail="Chart muncul setelah aktivitas tercatat pada sedikitnya dua periode." />;
  const max = Math.max(1, ...data.trends.map(x => Math.max(x.visitors, x.signupCompletions, x.activated)));
  return <div><div className="flex h-32 items-end gap-1" aria-label="Traffic trend chart">{data.trends.map(row => <div key={row.bucket} className="flex min-w-0 flex-1 items-end gap-px" title={`${date(row.bucket)} · ${row.visitors} visitors · ${row.signupCompletions} signups · ${row.activated} activated`}><span className="w-1/2 rounded-t bg-violet-400" style={{ height: `${Math.max(row.visitors ? 4 : 0, row.visitors / max * 100)}%` }} /><span className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${Math.max(row.signupCompletions || row.activated ? 4 : 0, Math.max(row.signupCompletions, row.activated) / max * 100)}%` }} /></div>)}</div><div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-slate-600"><span className="text-violet-600">■ Visitors</span><span className="text-emerald-600">■ Signup/activation</span><span className="ml-auto">{date(data.trends[0].bucket)} – {date(data.trends.at(-1)!.bucket)}</span></div></div>;
}

function RevenueTrend({ data }: { data: GrowthDashboard }) {
  const active = data.trends.filter(x => x.revenue > 0);
  if (!active.length) return <Empty title="Belum ada revenue pada periode ini" detail="Trend akan muncul setelah plan payment selesai." />;
  const max = Math.max(...data.trends.map(x => x.revenue), 1);
  return <div><div className="flex h-32 items-end gap-1" aria-label="Completed payment revenue chart">{data.trends.map(row => <div key={row.bucket} className="min-w-0 flex-1" title={`${date(row.bucket)} · ${money(row.revenue)}`}><div className="rounded-t bg-violet-500" style={{ height: `${Math.max(row.revenue ? 5 : 0, row.revenue / max * 128)}px` }} /></div>)}</div><div className="mt-3 flex justify-between border-t pt-3 text-xs text-slate-500"><span>Completed payment revenue</span><span>{money(data.trends.reduce((sum, row) => sum + row.revenue, 0))}</span></div></div>;
}

function Sources({ data, limit = 20 }: { data: GrowthDashboard; limit?: number }) {
  const rows = data.acquisition.slice(0, limit);
  if (!rows.length) return <Empty title="Belum ada attribution" detail="Source dan campaign muncul setelah visitor atau marketing spend tercatat." />;
  return <><div className="space-y-2 md:hidden">{rows.map(row => <div key={`${row.source}-${row.campaign}`} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{row.source}</p><p className="text-xs text-slate-500">{row.campaign}</p></div><p className="text-sm font-semibold">{row.signupCompletions} signup</p></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-500">Visitors</p><p className="font-medium">{row.visitors}</p></div><div><p className="text-slate-500">Spend</p><p className="font-medium">{money(row.spend)}</p></div><div><p className="text-slate-500">CAC</p><p className="font-medium">{money(row.cac)}</p></div></div></div>)}</div><div className="hidden md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="pb-2">Source / campaign</th><th className="pb-2">Visitors</th><th className="pb-2">Signups</th><th className="pb-2">Conversion</th><th className="pb-2">Spend</th><th className="pb-2">CAC</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.source}-${row.campaign}`} className="border-b border-slate-100 last:border-0"><td className="py-3"><p className="font-medium">{row.source}</p><p className="text-xs text-slate-500">{row.campaign}</p></td><td>{row.visitors}</td><td>{row.signupCompletions}</td><td>{percent(row.conversionRate)}</td><td>{money(row.spend)}</td><td>{money(row.cac)}</td></tr>)}</tbody></table></div></>;
}

const pageName = (path: string) => {
  if (path === "/app/dashboard") return "Dashboard";
  if (path.includes("/tasks")) return path.includes("[id]") ? "Task detail" : "Tasks";
  if (path.includes("/projects")) return path.includes("[id]") ? "Project detail" : "Projects";
  if (path.includes("/invoices")) return path.includes("[id]") ? "Invoice detail" : "Invoices";
  if (path.includes("/clients")) return path.includes("[id]") ? "Client detail" : "Clients";
  return path.replace(/^\/app\/?/, "").replaceAll("-", " ").replace(/\b\w/g, x => x.toUpperCase()) || "App";
};

export function GrowthKpiDashboard({ data, view = "overview", spendManager }: { data: GrowthDashboard; view?: View; spendManager?: React.ReactNode }) {
  const activationRate = data.signups ? data.activated / data.signups * 100 : null;
  const signupConversion = data.visitors ? data.signupCompletions / data.visitors * 100 : null;
  const organicShare = data.visitors ? data.organic / data.visitors * 100 : null;
  const referralShare = data.visitors ? data.referrals / data.visitors * 100 : null;
  const revenue = data.trends.reduce((sum, row) => sum + row.revenue, 0);
  const href = (nextView: string, range = data.range) => `/analytics?view=${nextView}&range=${range}`;
  const adoption = (value: number) => data.activeWorkspaces ? value / data.activeWorkspaces * 100 : null;

  return <div className="min-w-0 space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1><p className="mt-1 text-xs text-slate-500">Business and product performance · Updated {new Date(data.generatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div><nav aria-label="Date range" className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1">{ranges.map(range => <a key={range} href={href(view, range)} className={`rounded-md px-3 py-2 text-xs font-medium ${data.range === range ? "bg-[#6647F0] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{range}</a>)}</nav></header>
    <div className="relative -mx-1 overflow-hidden after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-slate-50 after:to-transparent md:after:hidden"><nav aria-label="Analytics view" className="flex gap-1 overflow-x-auto px-1 pb-1">{views.map(item => <a key={item} href={href(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium ${view === item ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-white"}`}>{item[0].toUpperCase() + item.slice(1)}</a>)}</nav></div>

    {view === "overview" && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Signups" value={data.signups} delta={comparePercent(data.signups, data.previous.signups)} /><Stat label="Activation rate" value={percent(activationRate)} delta={comparePercent(data.activated, data.previous.activated)} /><Stat label="Current paid" value={data.paidAccounts} help="Current active paid accounts" /><Stat label="MRR" value={money(data.mrr)} accent /></div>
      <div className="grid gap-4 xl:grid-cols-2"><Panel title="Acquisition flow" description="Events inside selected period; each stage uses the same tracking window."><MetricRows rows={[{ label: "Visitors", value: data.visitors }, { label: "Signup started", value: data.signupStarts }, { label: "Signup completed", value: data.signupCompletions }, { label: "Signup conversion", value: percent(signupConversion) }]} /></Panel><Panel title="Current business" description="Current recurring snapshot, separate from selected-period acquisition."><MetricRows rows={[{ label: "Paid accounts", value: data.paidAccounts }, { label: "MRR", value: money(data.mrr) }, { label: "ARR", value: money(data.arr) }, { label: "ARPU", value: money(data.arpu) }]} /></Panel></div>
      <div className="grid gap-4 xl:grid-cols-2"><Panel title="Traffic and activation trend" description="Daily buckets; monthly for 12 months."><TrafficTrend data={data} /></Panel><Panel title="Top acquisition sources" description="Top three sources by completed signup."><Sources data={data} limit={3} /></Panel></div>
    </>}

    {view === "acquisition" && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Visitors" value={data.visitors} /><Stat label="Signup started" value={data.signupStarts} /><Stat label="Signup completed" value={data.signupCompletions} /><Stat label="Conversion" value={percent(signupConversion)} help={signupConversion == null ? "Needs visitor and signup data" : undefined} /><Stat label="Organic share" value={percent(organicShare)} /><Stat label="Referral share" value={percent(referralShare)} /><Stat label="Marketing spend" value={money(data.spend)} /><Stat label="CAC" value={money(data.cac)} help={data.cac == null ? "Needs spend and completed signup" : undefined} /></div>
      <Panel title="Traffic trend" description="Visitors, completed signup, and activation over time."><TrafficTrend data={data} /></Panel>
      <Panel title="Source performance" description="Attribution and spend within selected period."><Sources data={data} /></Panel>
      {spendManager}
    </>}

    {view === "usage" && <>
      <Panel title="Top pages" description="Forward-looking page tracking; dynamic IDs and query strings are removed.">{data.usagePages.length === 0 ? <Empty title="Page usage tracking is collecting data" detail="Ranking appears after signed-in users navigate the app." /> : <div className="divide-y divide-slate-100">{data.usagePages.map((row, index) => <div key={row.page} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3"><span className="text-xs font-semibold text-slate-400">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{pageName(row.page)}</p><p className="truncate text-xs text-slate-500">{row.page}</p></div><div className="text-right"><p className="text-sm font-semibold">{row.views} views</p><p className="text-xs text-slate-500">{row.uniqueActors} people · {row.workspaces} workspaces</p></div></div>)}</div>}</Panel>
      <Panel title="Most-used features" description="Operational actions plus future tracked feature events."><div className="divide-y divide-slate-100">{data.usageFeatures.map((row, index) => { const tracked = row.feature === "Tracked feature"; return <div key={`${row.feature}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3"><span className="text-xs font-semibold text-slate-400">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-900">{row.feature}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tracked ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{tracked ? "Tracked" : "Operational"}</span></div><p className="text-xs text-slate-500">{row.workspaces} workspaces · {percent(adoption(row.workspaces))} of active workspaces</p></div><div className="text-right"><p className="text-sm font-semibold">{row.actions} actions</p>{row.uniqueActors > 0 && <p className="text-xs text-slate-500">{row.uniqueActors} people</p>}</div></div>; })}</div></Panel>
    </>}

    {view === "product" && <div className="grid gap-4 xl:grid-cols-2"><Panel title="Active this period" description="People and workspaces with meaningful product activity."><MetricRows rows={[{ label: "Active workspaces", value: data.activeWorkspaces }, { label: "Active users", value: data.activeUsers }, { label: "Weekly active users", value: data.wau }, { label: "Monthly active users", value: data.mau }]} /></Panel><Panel title="Usage intensity" description="How deeply active users work in the product."><MetricRows rows={[{ label: "Projects per active user", value: number.format(data.projectsPerActiveUser ?? 0) }, { label: "Tasks per project", value: number.format(data.tasksPerProject ?? 0) }, { label: "Projects created", value: data.projects }, { label: "Tasks created", value: data.tasks }]} /></Panel><Panel title="First-value milestones" description="Workspaces reaching each milestone for the first time."><MetricRows rows={[{ label: "First client", value: data.firstClientCount }, { label: "First project", value: data.firstProjectCount }, { label: "First task", value: data.firstTaskCount }, { label: "First invoice", value: data.firstInvoiceCount }, { label: "First portal visit", value: data.firstPortalCount }]} /></Panel><Panel title="Feature adoption" description="Share of active workspaces using each feature."><MetricRows rows={[{ label: "Time tracking", value: `${data.timeTrackingWorkspaces} workspaces`, note: `${percent(adoption(data.timeTrackingWorkspaces))} adoption` }, { label: "Client portal", value: `${data.portalWorkspaces} workspaces`, note: `${percent(adoption(data.portalWorkspaces))} adoption` }]} /></Panel></div>}

    {view === "revenue" && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="MRR" value={money(data.mrr)} accent /><Stat label="ARR" value={money(data.arr)} /><Stat label="Paid accounts" value={data.paidAccounts} /><Stat label="ARPU" value={money(data.arpu)} /></div>
      <div className="grid gap-4 xl:grid-cols-2"><Panel title="Selected-period payment flow" description="Completed plan payments inside selected range."><MetricRows rows={[{ label: "Completed plan payments", value: data.completedPayments }, { label: "Revenue collected", value: money(revenue) }]} /></Panel><Panel title="Subscription lifecycle" description="Forward-looking lifecycle events inside selected range."><MetricRows rows={[{ label: "Started", value: data.subscriptionStarted }, { label: "Renewed", value: data.subscriptionRenewed }, { label: "Upgraded", value: data.subscriptionUpgraded }, { label: "Reactivated", value: data.subscriptionReactivated }, { label: "Expired", value: data.subscriptionExpired }]} /></Panel></div>
      <Panel title="Completed payment revenue" description="Payment flow, not an MRR timeline."><RevenueTrend data={data} /></Panel>
    </>}

    {view === "retention" && <Panel title="Retention analytics readiness" description="Lifecycle tracking is forward-looking; unavailable rates are not replaced with zero."><div className="grid gap-5 lg:grid-cols-2"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available now</h3><div className="mt-2 space-y-2">{[{ label: "Started events", value: data.subscriptionStarted }, { label: "Renewed events", value: data.subscriptionRenewed }, { label: "Reactivation events", value: data.subscriptionReactivated }, { label: "Expiry events", value: data.subscriptionExpired }].map(item => <div key={item.label} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5"><span className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="size-4" />{item.label}</span><strong className="text-sm text-emerald-900">{item.value}</strong></div>)}</div>{data.subscriptionTrackingSince && <p className="mt-3 text-xs text-slate-500">Tracking since {date(data.subscriptionTrackingSince)}</p>}</div><div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs more history</h3><div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">{[{ label: "Monthly churn", reason: "Needs paid accounts at period start." }, { label: "Cohort retention", reason: "Needs matured signup cohorts." }, { label: "Annual retention", reason: "Needs a full renewal cycle." }, { label: "Lifetime value", reason: "Needs reliable retention and revenue history." }].map(item => <div key={item.label} className="p-3"><p className="text-sm font-medium text-slate-800">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p></div>)}</div></div></div></Panel>}
  </div>;
}

export default GrowthKpiDashboard;
export type { View };
export { views };
