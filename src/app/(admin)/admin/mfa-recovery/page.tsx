import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MfaRecoveryActions } from "@/components/admin/mfa-recovery-actions";
import { listMfaRecoveries } from "@/lib/actions/admin/mfa-recovery";

export const dynamic = "force-dynamic";
const wib = (date: Date | null) => date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(date)) + " WIB" : "—";
const recoveryStatus = (row: {status:string;ready:boolean;coolingElapsed:boolean}) => row.status === "pending" ? (row.ready ? "ready" : row.coolingElapsed ? "awaiting approvals" : "cooling") : row.status;

export default async function MfaRecoveryPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  const params = await searchParams;
  const data = await listMfaRecoveries({ status: (params.status as "all" | "pending" | "cooling" | "ready" | "executed" | "rejected") || "all", search: params.search || "", page: params.page || "1" });
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-semibold tracking-tight">MFA recovery</h1><p className="text-sm text-muted-foreground">72-hour cooling period. Two distinct admin approvals. Historical requests remain read-only.</p></header>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(data.summary).map(([key, value]) => <Card key={key}><CardContent className="p-3"><p className="text-xs uppercase text-muted-foreground">{key}</p><p className="text-2xl font-semibold">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Recovery requests</CardTitle><form className="flex gap-2"><Input name="search" defaultValue={params.search} placeholder="Search name or email" className="w-56" /><select name="status" defaultValue={params.status || "all"} className="rounded-md border bg-background px-2 text-sm"><option value="all">All statuses</option>{["pending","cooling","ready","executed","rejected"].map((s) => <option key={s}>{s}</option>)}</select></form></CardHeader><CardContent className="space-y-3 p-3">{data.rows.map((row) => <article key={row.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><a className="font-medium underline" href={`/users/${row.userId}`}>{row.name || row.email}</a><p className="text-xs text-muted-foreground">{row.email} · verified {row.verified ? "yes" : "no"} · banned {row.banned ? "yes" : "no"}</p></div><Badge variant={row.status === "rejected" ? "destructive" : row.ready ? "success" : "warning"}>{recoveryStatus(row)}</Badge></div><p className="mt-3 text-sm">{row.reason}</p><p className="mt-2 text-xs text-muted-foreground">Created {wib(row.createdAt)} · cooling until {wib(row.coolingUntil)} · approvals {row.approvals}/2</p><MfaRecoveryActions requestId={row.id} coolingElapsed={row.coolingElapsed} ready={row.ready} approvals={row.approvals} readOnly={row.status !== "pending"} /></article>)}{data.rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No recovery requests match filters.</p>}</CardContent></Card>
  </div>;
}

export function generateMetadata() { return { title: "MFA recovery" }; }

export { wib };
