import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contracts, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSignature } from "lucide-react";
import { CreateContractButton } from "@/components/contracts/create-contract-button";
import { projectStatusVariant } from "@/lib/status-badge";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ContractsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const rows = await db
    .select({
      id: contracts.id,
      title: contracts.title,
      status: contracts.status,
      sentAt: contracts.sentAt,
      viewedAt: contracts.viewedAt,
      signedAt: contracts.signedAt,
      declinedAt: contracts.declinedAt,
      validUntil: contracts.validUntil,
      createdAt: contracts.createdAt,
      clientId: contracts.clientId,
      clientName: clients.name,
    })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(eq(contracts.workspaceId, workspaceId))
    .orderBy(desc(contracts.createdAt))
    .limit(100);

  const clientsList = await db.select({ id: clients.id, name: clients.name })
    .from(clients).where(eq(clients.workspaceId, workspaceId));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-slate-500 mt-1">Send a contract to a client. They sign in the browser. You get an audit trail.</p>
        </div>
        {canWrite && <CreateContractButton clients={clientsList} workspaceId={workspaceId} />}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileSignature className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">No contracts yet. Create one to start e-signing.</p>
          {canWrite && <CreateContractButton clients={clientsList} workspaceId={workspaceId} />}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const status = projectStatusVariant(c.status);
                return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/app/contracts/${c.id}`} className="font-medium text-sm hover:underline">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/app/clients/${c.clientId}`} className="text-slate-600 hover:underline">
                      {c.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {c.signedAt ? `Signed ${new Date(c.signedAt).toLocaleDateString()}` :
                     c.declinedAt ? `Declined ${new Date(c.declinedAt).toLocaleDateString()}` :
                     c.viewedAt ? `Viewed ${new Date(c.viewedAt).toLocaleDateString()}` :
                     c.sentAt ? `Sent ${new Date(c.sentAt).toLocaleDateString()}` :
                     `Draft ${new Date(c.createdAt).toLocaleDateString()}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/app/contracts/${c.id}`} className="text-sm text-indigo-600 hover:underline">
                      Open
                    </Link>
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
