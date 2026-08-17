import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CreateUserButton } from "@/components/admin/create-user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { listUsers } from "@/lib/actions/admin/users";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Number(sp.page) || 1;

  const data = await listUsers({ search, page });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">Users</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} total — page {data.page} / {data.totalPages}
          </p>
        </div>
        <CreateUserButton />
      </div>

      <form method="get" className="max-w-md">
        <Input name="search" defaultValue={search} placeholder="Search by name or email…" className="max-w-md" />
      </form>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link href={`/users/${u.id}`} className="text-[#6647F0] hover:underline">
                      {u.name || "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.plan === "free" ? "secondary" : "success"}>{u.plan}</Badge>
                    {u.planExpiresAt ? (
                      <span className="ml-1 text-xs text-muted-foreground">{formatDateID(u.planExpiresAt)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : u.emailVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateID(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <UserActions user={u} />
                  </TableCell>
                </TableRow>
              ))}
              {data.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 && (
            <Link
              href={`/users?search=${encodeURIComponent(search)}&page=${page - 1}`}
              className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-sm text-[#292D34] hover:bg-slate-50"
            >
              Prev
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          {page < data.totalPages && (
            <Link
              href={`/users?search=${encodeURIComponent(search)}&page=${page + 1}`}
              className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-sm text-[#292D34] hover:bg-slate-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
