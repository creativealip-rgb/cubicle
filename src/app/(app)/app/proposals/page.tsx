import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText } from "lucide-react";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { formatMoney } from "@/lib/utils";
import { projectStatusVariant } from "@/lib/status-badge";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ProposalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      total: proposals.total,
      currency: proposals.currency,
      sentAt: proposals.sentAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      createdAt: proposals.createdAt,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(proposals)
    .innerJoin(clients, eq(clients.id, proposals.clientId))
    .where(eq(proposals.workspaceId, workspaceId))
    .orderBy(desc(proposals.createdAt))
    .limit(100);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-slate-500 mt-1">Kirim scope + harga ke calon klien. Setelah diterima, kerja bisa dimulai.</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/app/proposals/new">
              <Plus className="h-4 w-4 mr-1" />
              Proposal Baru
            </Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">Belum ada proposal. Buat proposal untuk mulai kirim scope.</p>
          {canWrite && (
            <Button asChild>
              <Link href="/app/proposals/new">
                <Plus className="h-4 w-4 mr-1" />
                Buat proposal pertama
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Klien</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Diperbarui</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const status = projectStatusVariant(p.status);
                return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/app/proposals/${p.id}`} className="font-medium text-sm hover:underline">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/app/clients/${p.clientId}`} className="text-slate-600 hover:underline">
                      {p.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatMoney(p.total, p.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {p.acceptedAt ? `Diterima ${new Date(p.acceptedAt).toLocaleDateString("id-ID")}` :
                     p.declinedAt ? `Ditolak ${new Date(p.declinedAt).toLocaleDateString("id-ID")}` :
                     p.sentAt ? `Terkirim ${new Date(p.sentAt).toLocaleDateString("id-ID")}` :
                     `Draft ${new Date(p.createdAt).toLocaleDateString("id-ID")}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "draft" && canWrite && (
                      <SendProposalButton proposalId={p.id} />
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
