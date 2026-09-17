import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CreateUserButton } from "@/components/admin/create-user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { listUsers } from "@/lib/actions/admin/users";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";
const query = (p: Record<string, string | undefined>) => new URLSearchParams(Object.entries(p).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const plan = sp.plan as "free" | "solo" | "team" | undefined;
  const role = sp.role as "user" | "admin" | undefined;
  const status = sp.status;
  const page = Number(sp.page) || 1;
  const data = await listUsers({
    search,
    plan,
    role,
    page,
    banned: status === "banned" ? true : status === "active" || status === "unverified" ? false : undefined,
    verified: status === "unverified" ? false : status === "active" ? true : undefined,
  });
  const filters = { search, plan, role, status };
  const label = (u: (typeof data.users)[number]) => u.banned ? "Banned" : u.emailVerified ? "Active" : "Unverified";
  const badge = (u: (typeof data.users)[number]) => <Badge variant={u.banned ? "destructive" : u.emailVerified ? "success" : "warning"}>{label(u)}</Badge>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6647F0]">Control plane</p><h1 className="text-3xl font-semibold tracking-tight text-[#292D34]">Users</h1><p className="mt-1 text-sm text-muted-foreground">{data.total} matching accounts · page {data.page} / {data.totalPages}</p></div><CreateUserButton /></header>
    <div className="grid grid-cols-2 divide-x rounded-xl border bg-white shadow-sm sm:grid-cols-5"><Stat label="All users" value={data.summary.total}/><Stat label="Paid" value={data.summary.paid}/><Stat label="Unverified" value={data.summary.unverified}/><Stat label="Banned" value={data.summary.banned}/><Stat label="Admins" value={data.summary.admin}/></div>
    <Card><CardContent className="p-4"><form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_150px_auto]"><Input name="search" defaultValue={search} placeholder="Search name or email…"/><select name="plan" defaultValue={plan ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All plans</option><option value="free">Free</option><option value="solo">Solo</option><option value="team">Team</option></select><select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All status</option><option value="active">Active</option><option value="unverified">Unverified</option><option value="banned">Banned</option></select><select name="role" defaultValue={role ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All roles</option><option value="user">User</option><option value="admin">Admin</option></select><button className="h-10 rounded-md bg-[#6647F0] px-4 text-sm font-medium text-white">Filter</button></form>{(search || plan || role || status) && <Link href="/users" className="mt-3 inline-block text-sm text-[#6647F0] hover:underline">Clear filters</Link>}</CardContent></Card>
    <Card className="overflow-hidden"><CardContent className="p-0"><div className="divide-y md:hidden">{data.users.map(u => <div key={u.id} className="space-y-3 p-4"><div className="flex justify-between gap-3"><div><Link href={`/users/${u.id}`} className="font-semibold text-[#6647F0] hover:underline">{u.name || "Unnamed user"}</Link><p className="break-all text-sm text-muted-foreground">{u.email}</p></div><UserActions user={u}/></div><div className="flex flex-wrap gap-2 text-sm">{badge(u)}<Badge variant="secondary">{u.plan}</Badge><span className="text-muted-foreground">{u.workspaceCount} workspaces · {formatDateID(u.createdAt)}</span></div></div>)}{!data.users.length && <MobileEmpty filtered={Boolean(search || plan || role || status)}/>}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Identity</TableHead><TableHead>Plan</TableHead><TableHead>Workspaces</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{data.users.map(u => <TableRow key={u.id}><TableCell><Link href={`/users/${u.id}`} className="font-semibold text-[#6647F0] hover:underline">{u.name || "Unnamed user"}</Link><div className="text-sm text-muted-foreground">{u.email}</div></TableCell><TableCell><Badge variant={u.plan === "free" ? "secondary" : "success"}>{u.plan}</Badge>{u.planExpiresAt && <div className="text-xs text-muted-foreground">until {formatDateID(u.planExpiresAt)}</div>}</TableCell><TableCell>{u.workspaceCount}</TableCell><TableCell>{badge(u)}<div className="mt-1 text-xs text-muted-foreground">{u.role}</div></TableCell><TableCell className="text-muted-foreground">{formatDateID(u.createdAt)}</TableCell><TableCell className="text-right"><UserActions user={u}/></TableCell></TableRow>)}{!data.users.length && <Empty filtered={Boolean(search || plan || role || status)}/>}</TableBody></Table></div></CardContent></Card>
    {data.totalPages > 1 && <div className="flex justify-end gap-2 text-sm">{page > 1 && <Link className="rounded border px-3 py-1.5" href={`/users?${query({...filters, page: String(page - 1)})}`}>Prev</Link>}<span className="px-2 py-1.5 text-muted-foreground">{page} / {data.totalPages}</span>{page < data.totalPages && <Link className="rounded border px-3 py-1.5" href={`/users?${query({...filters, page: String(page + 1)})}`}>Next</Link>}</div>}
  </div>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-[#292D34]">{value}</p></div>; }
function Empty({ filtered }: { filtered: boolean }) { return <TableRow><TableCell colSpan={6} className="py-14 text-center"><p className="font-medium">{filtered ? "No users match filters" : "No users yet"}</p><p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try clearing filters or broadening search." : "Create first user to get started."}</p></TableCell></TableRow>; }
function MobileEmpty({ filtered }: { filtered: boolean }) { return <div className="p-10 text-center"><p className="font-medium">{filtered ? "No users match filters" : "No users yet"}</p><p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try clearing filters or broadening search." : "Create first user to get started."}</p></div>; }
