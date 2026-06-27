import { getWorkspaceForCurrentUser, getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contracts, clients, projects, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendContractButton } from "@/components/contracts/send-contract-button";
import { RevokeContractButton } from "@/components/contracts/revoke-contract-button";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, X, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "signed": return "default";
    case "sent": case "viewed": return "secondary";
    case "declined": case "expired": case "revoked": return "destructive";
    default: return "outline";
  }
}

export default async function ContractDetailPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const [c] = await db.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!c) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, c.clientId)).limit(1);
  const [project] = c.projectId
    ? await db.select().from(projects).where(eq(projects.id, c.projectId)).limit(1)
    : [null];

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/contracts">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
            <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            For: <Link href={`/app/clients/${c.clientId}`} className="text-slate-700 hover:underline font-medium">{client?.name}</Link>
            {project && <> · Project: <Link href={`/app/projects/${c.projectId}`} className="text-slate-700 hover:underline">{project.name}</Link></>}
          </p>
          {c.validUntil && (
            <p className="text-xs text-slate-500">Valid until: {new Date(c.validUntil).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button variant="outline" asChild>
              <a href={`/api/contracts/${c.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-1" />
                Download PDF
              </a>
            </Button>
          )}
          {(c.status === "draft") && canWrite && (
            <SendContractButton contractId={c.id} />
          )}
          {(c.status === "sent" || c.status === "viewed") && canWrite && (
            <RevokeContractButton contractId={c.id} />
          )}
        </div>
      </div>

      {c.status === "signed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Signed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Signatory</div>
                <div className="font-medium">{c.signedName}</div>
                <div className="text-xs text-slate-500">{c.signedEmail}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Signed at</div>
                <div className="font-medium">{c.signedAt ? new Date(c.signedAt).toLocaleString() : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">IP address</div>
                <div className="font-mono text-xs">{c.signedFromIp}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">User agent</div>
                <div className="text-xs truncate">{c.signedUserAgent}</div>
              </div>
            </div>
            {c.signatureDataUrl && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Signature</div>
                <div className="border rounded-md p-2 bg-white max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.signatureDataUrl} alt="signature" className="h-24 w-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {c.status === "declined" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <X className="h-5 w-5" />
              Declined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="text-xs text-slate-500">Declined at</div>
              <div>{c.declinedAt ? new Date(c.declinedAt).toLocaleString() : "—"}</div>
            </div>
            {c.declineReason && (
              <div className="mt-3">
                <div className="text-xs text-slate-500">Reason</div>
                <div className="text-sm bg-slate-50 border rounded p-2 mt-1">{c.declineReason}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {c.bodyResolved ? "Sent body (rendered)" : "Draft body"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{c.bodyResolved || c.body}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {c.sentAt && (
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>Sent: {new Date(c.sentAt).toLocaleString()}</div>
          {c.viewedAt && <div>Viewed: {new Date(c.viewedAt).toLocaleString()}</div>}
          {c.sharedTokenExpiresAt && <div>Token expires: {new Date(c.sharedTokenExpiresAt).toLocaleString()}</div>}
        </div>
      )}
    </div>
  );
}
