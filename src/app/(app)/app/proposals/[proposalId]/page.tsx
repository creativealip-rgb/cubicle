import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients, workspaces, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { ArrowLeft } from "lucide-react";

function formatMoney(amount: string | number, currency: string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (currency === "IDR") return `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default async function ProposalDetailPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, await getWorkspaceForCurrentUser())).limit(1);
  if (!ws) throw new Error("Workspace not found");
  const member = await assertWorkspaceMember(db, user.id, ws.id);
  const canWrite = member.role === "owner" || member.role === "member";

  const [p] = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      body: proposals.body,
      lineItems: proposals.lineItems,
      subtotal: proposals.subtotal,
      tax: proposals.tax,
      total: proposals.total,
      currency: proposals.currency,
      downPaymentPercent: proposals.downPaymentPercent,
      validUntil: proposals.validUntil,
      status: proposals.status,
      sentAt: proposals.sentAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      declineReason: proposals.declineReason,
      projectId: proposals.projectId,
      clientId: clients.id,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(proposals)
    .innerJoin(clients, eq(clients.id, proposals.clientId))
    .where(and(eq(proposals.id, proposalId), eq(proposals.workspaceId, ws.id)))
    .limit(1);
  if (!p) notFound();

  const items = (p.lineItems as Array<{ description: string; quantity?: number; qty?: number; unitPrice?: number; unit_price?: number; amount: number }> | null ?? []).map((li) => ({
    description: li.description,
    quantity: li.quantity ?? li.qty ?? 1,
    unitPrice: li.unitPrice ?? li.unit_price ?? 0,
    amount: li.amount ?? ((li.quantity ?? li.qty ?? 1) * (li.unitPrice ?? li.unit_price ?? 0)),
  }));
  const subtotal = p.subtotal ?? items.reduce((s, li) => s + Number(li.amount), 0);
  const tax = p.tax ?? 0;
  const total = p.total ?? (subtotal + Number(tax));

  // Get created project if accepted
  let projectName: string | null = null;
  if (p.projectId) {
    const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, p.projectId)).limit(1);
    projectName = proj?.name ?? null;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/app/proposals">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              All proposals
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Untuk <Link href={`/app/clients/${p.clientId}`} className="text-slate-700 hover:underline">{p.clientName}</Link>
            {p.clientEmail && <> · {p.clientEmail}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={p.status === "accepted" ? "default" : p.status === "declined" ? "destructive" : "secondary"}>
            {p.status}
          </Badge>
          {p.status === "draft" && canWrite && <SendProposalButton proposalId={p.id} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-32">Satuan</TableHead>
                <TableHead className="text-right w-32">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((li, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{li.description}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{li.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatMoney(li.unitPrice, p.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">{formatMoney(li.amount, p.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t pt-3 mt-3 text-sm space-y-1">
            <div className="flex justify-end gap-8"><span className="text-slate-500">Subtotal</span><span className="tabular-nums w-32 text-right">{formatMoney(subtotal, p.currency)}</span></div>
            {Number(tax) > 0 && <div className="flex justify-end gap-8"><span className="text-slate-500">Tax</span><span className="tabular-nums w-32 text-right">{formatMoney(tax, p.currency)}</span></div>}
            <div className="flex justify-end gap-8 pt-2 border-t font-semibold"><span>Total</span><span className="tabular-nums w-32 text-right">{formatMoney(total, p.currency)}</span></div>
          </div>
        </CardContent>
      </Card>

      {p.body && (
        <Card>
          <CardHeader><CardTitle className="text-base">Scope</CardTitle></CardHeader>
          <CardContent><div className="prose prose-sm max-w-none text-slate-700"><ReactMarkdown>{p.body}</ReactMarkdown></div></CardContent>
        </Card>
      )}

      {p.status === "accepted" && p.projectId && (
        <Card>
          <CardHeader><CardTitle className="text-base">Hasil</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✅ Project dibuat: <Link href={`/app/projects/${p.projectId}`} className="text-blue-600 hover:underline">{projectName ?? "Lihat project"}</Link></p>
            <p>✅ Invoice DP dikirim ke {p.clientName}.</p>
            <p className="text-xs text-slate-500">Diterima {p.acceptedAt && new Date(p.acceptedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
      {p.status === "declined" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ditolak</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {p.declineReason && <p>Alasan: {p.declineReason}</p>}
            <p className="text-xs text-slate-500 mt-2">Ditolak {p.declinedAt && new Date(p.declinedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
