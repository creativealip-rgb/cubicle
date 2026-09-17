import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserActions } from "@/components/admin/user-actions";
import { getUserDetail } from "@/lib/actions/admin/users";
import { formatDateID, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
/* eslint-disable react-hooks/purity -- server-rendered session status intentionally uses request-time clock. */

const date = (value: Date | string | null | undefined) => value ? formatDateID(value) : "—";
const agent = (value: string | null) => {
  if (!value) return "Unknown device";
  return value.replace(/\s+/g, " ").slice(0, 90);
};
const maskIp = (value: string | null) => value ? value.replace(/(\d+\.\d+\.)\d+(\.\d+)/, "$1•••$2") : "—";
const initials = (name: string | null, email: string) => (name || email).split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const data = await getUserDetail(userId);
  if (!data) notFound();
  const { user } = data;
  const role = user.role ?? "user";
  const banned = Boolean(user.banned);
  const workspaces = [...data.ownedWorkspaces.map((w) => ({ ...w, role: "Owner", owner: true })), ...data.memberships.filter((m) => !data.ownedWorkspaces.some((w) => w.id === m.workspaceId)).map((m) => ({ id: m.workspaceId, name: m.workspaceName, slug: null, createdAt: null, role: m.role, owner: false }))];
  const activeSessions = data.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now()).length;
  const paidTotal = data.payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return <div className="space-y-6">
    <Link href="/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Back to users</Link>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">{initials(user.name, user.email)}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{user.name || "Unnamed user"}</h1><Badge variant={banned ? "destructive" : "success"}>{banned ? "Banned" : "Active"}</Badge><Badge variant={user.emailVerified ? "success" : "secondary"}>{user.emailVerified ? "Verified" : "Unverified"}</Badge></div><p className="text-sm text-muted-foreground">{user.email} · <span className="font-mono">{user.id}</span></p></div></div>
      <UserActions user={{ id: user.id, name: user.name ?? null, email: user.email, emailVerified: user.emailVerified ?? false, role: role as "user" | "admin", banned, plan: user.plan ?? "free", planExpiresAt: user.planExpiresAt ?? null, createdAt: user.createdAt, workspaceCount: workspaces.length }} />
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[[data.stats.clients, "Clients"], [data.stats.projects, "Projects"], [data.stats.invoices, "Invoices"], [workspaces.length, "Workspaces"]].map(([value, label]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Account & billing</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><Info label="Plan" value={user.plan ?? "free"} /><Info label="Plan expiry" value={date(user.planExpiresAt)} /><Info label="Joined" value={date(user.createdAt)} /><Info label="Verification" value={user.emailVerified ? "Email verified" : "Email not verified"} /><Info label="Role" value={role} /><Info label="Account age" value={`${Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))} days`} />{banned && <Info label="Banned" value={`${date(user.bannedAt)}${user.bannedReason ? ` · ${user.bannedReason}` : ""}`} />}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Security & access</CardTitle><CardDescription>Session expiry indicates active access. No fake last-seen data.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><Info label="Active sessions" value={String(activeSessions)} /><Info label="Latest session" value={data.sessions[0] ? date(data.sessions[0].createdAt) : "No sessions"} /><Info label="Latest IP" value={data.sessions[0] ? maskIp(data.sessions[0].ipAddress) : "—"} /><Info label="Latest device" value={data.sessions[0] ? agent(data.sessions[0].userAgent) : "—"} /></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Workspace access</CardTitle><CardDescription>{data.ownedWorkspaces.length} owned · {data.memberships.length} memberships</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{workspaces.map((w) => <Link key={w.id} href={`/workspaces/${w.id}`} className="rounded-lg border p-3 transition hover:border-primary"><div className="flex justify-between gap-2 font-medium">{w.name || "Unnamed workspace"}<span className="text-xs text-muted-foreground">{w.role}</span></div><p className="text-xs text-muted-foreground">{w.owner ? "Workspace owner" : "Member access"}{w.slug ? ` · ${w.slug}` : ""}</p></Link>)}{!workspaces.length && <p className="text-sm text-muted-foreground">No workspace access.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Recent payments</CardTitle><CardDescription>{paidTotal ? `${formatMoney(paidTotal)} completed total` : "No completed payments"}</CardDescription></CardHeader><CardContent className="grid gap-2">{data.payments.map((p) => <div key={p.id} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-mono text-xs">{p.orderId}</p><p className="text-muted-foreground">{p.plan} · {p.billingPeriod} · {p.paymentType}</p></div><Badge variant={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "secondary"}>{p.status}</Badge><div className="text-right"><p className="font-medium">{formatMoney(p.amount)}</p><p className="text-xs text-muted-foreground">{date(p.paidAt || p.createdAt)}</p></div></div>)}{!data.payments.length && <p className="text-sm text-muted-foreground">No payments.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Sessions</CardTitle></CardHeader><CardContent className="grid gap-2">{data.sessions.map((s) => { const active = new Date(s.expiresAt).getTime() > Date.now(); return <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{agent(s.userAgent)}</p><p className="text-xs text-muted-foreground">{maskIp(s.ipAddress)} · Created {date(s.createdAt)} · Expires {date(s.expiresAt)}</p></div><Badge variant={active ? "success" : "secondary"}>{active ? "Active" : "Expired"}</Badge></div>; })}{!data.sessions.length && <p className="text-sm text-muted-foreground">No sessions.</p>}</CardContent></Card>
  </div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>; }
