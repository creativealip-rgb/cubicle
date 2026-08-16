import Link from "next/link";
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
import { listWorkspaces } from "@/lib/actions/admin/workspaces";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Number(sp.page) || 1;

  const data = await listWorkspaces({ search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          {data.total} total — page {data.page} / {data.totalPages}
        </p>
      </div>

      <form method="get" className="max-w-md">
        <Input name="search" defaultValue={search} placeholder="Search by name or slug…" />
      </form>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All workspaces</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.workspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <Link href={`/workspaces/${w.id}`} className="text-[#6647F0] hover:underline">
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{w.slug}</TableCell>
                  <TableCell>
                    {w.ownerName ?? "—"}
                    <span className="block text-xs text-muted-foreground">{w.ownerEmail}</span>
                  </TableCell>
                  <TableCell>{w.memberCount}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateID(w.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data.workspaces.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No workspaces found.
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
              href={`/workspaces?search=${encodeURIComponent(search)}&page=${page - 1}`}
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
              href={`/workspaces?search=${encodeURIComponent(search)}&page=${page + 1}`}
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
