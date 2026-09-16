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
import { listAuditLogs } from "@/lib/actions/admin/audit";
import { formatDateID } from "@/lib/utils";
import { humanizeAuditAction, metadataJson, summarizeAuditMetadata } from "./audit-metadata";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const action = sp.action ?? "";
  const page = Number(sp.page) || 1;

  const data = await listAuditLogs({ page, action });

  const actions = [
    "user.create",
    "user.update",
    "user.password_reset",
    "user.ban",
    "user.unban",
    "user.plan_change",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Immutable trail of every admin mutation · {data.total} total — page {data.page} / {data.totalPages}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkFilter href="/audit" active={!action} label="All" />
        {actions.map((a) => (
          <LinkFilter key={a} href={`/audit?action=${encodeURIComponent(a)}`} active={action === a} label={a} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {data.logs.map((l) => <div key={l.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><Badge>{humanizeAuditAction(l.action)}</Badge><time className="text-xs text-muted-foreground">{formatDateID(l.createdAt)}</time></div><p className="mt-2 text-sm">{l.adminName ?? "—"} <span className="text-xs text-muted-foreground">{l.adminEmail}</span></p><p className="text-xs text-muted-foreground">Target: {l.targetUserId?.slice(0, 12) ?? l.targetWorkspaceId ?? "—"}</p><p className="mt-2 text-sm">{summarizeAuditMetadata(l.metadata)}</p><details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Raw details</summary><pre className="mt-1 whitespace-pre-wrap break-all">{metadataJson(l.metadata)}</pre></details></div>)}
            {data.logs.length === 0 && <p className="py-8 text-center text-muted-foreground">No audit events found.</p>}
          </div>
          <div className="hidden overflow-x-auto md:block"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Badge variant={l.action.includes("ban") ? "destructive" : l.action.includes("plan") ? "info" : "secondary"}>
                      {humanizeAuditAction(l.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.adminName ?? "—"}
                    <span className="block text-xs text-muted-foreground">{l.adminEmail}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.targetUserId ? (
                      <span className="font-mono">{l.targetUserId.slice(0, 12)}…</span>
                    ) : l.targetWorkspaceId ? (
                      <span className="font-mono">{l.targetWorkspaceId}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                    {JSON.stringify(l.metadata)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.ipAddress ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateID(l.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data.logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No audit events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 && (
            <LinkFilter
              href={`/audit?action=${encodeURIComponent(action)}&page=${page - 1}`}
              active={false}
              label="Prev"
            />
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          {page < data.totalPages && (
            <LinkFilter
              href={`/audit?action=${encodeURIComponent(action)}&page=${page + 1}`}
              active={false}
              label="Next"
            />
          )}
        </div>
      )}
    </div>
  );
}

function LinkFilter({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? "bg-[#6647F0] text-white" : "bg-white text-[#292D34] border border-[#D9D9D9]"
      }`}
    >
      {label}
    </Link>
  );
}
