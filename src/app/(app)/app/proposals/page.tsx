import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients, workspaces } from "@/db/schema";
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
import { Plus, FileText, Send } from "lucide-react";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

function formatMoney(amount: string, currency: string) {
  const n = parseFloat(amount);
  if (currency === "IDR") return `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted": return "default";
    case "sent": case "viewed": return "secondary";
    case "declined": case "expired": return "destructive";
    default: return "outline";
  }
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
          <p className="text-sm text-slate-500 mt-1">Send scope + price to a prospective client. They accept and you start work.</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/app/proposals/new">
              <Plus className="h-4 w-4 mr-1" />
              New proposal
            </Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">No proposals yet. Create one to start sending scopes.</p>
          {canWrite && (
            <Button asChild>
              <Link href="/app/proposals/new">
                <Plus className="h-4 w-4 mr-1" />
                Create your first proposal
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
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
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatMoney(p.total, p.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {p.acceptedAt ? `Accepted ${new Date(p.acceptedAt).toLocaleDateString()}` :
                     p.declinedAt ? `Declined ${new Date(p.declinedAt).toLocaleDateString()}` :
                     p.sentAt ? `Sent ${new Date(p.sentAt).toLocaleDateString()}` :
                     `Draft ${new Date(p.createdAt).toLocaleDateString()}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "draft" && canWrite && (
                      <SendProposalButton proposalId={p.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
