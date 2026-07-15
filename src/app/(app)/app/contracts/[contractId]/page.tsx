import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contracts, clients, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendContractButton } from "@/components/contracts/send-contract-button";
import { RevokeContractButton } from "@/components/contracts/revoke-contract-button";
import { DeleteContractButton } from "@/components/contracts/delete-contract-button";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, X, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { projectStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";

function normalizeBody(body: string) {
  return body.replace(/\\n/g, "\n");
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = lang === "en" ? "en-US" : "id-ID";

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const [c] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .limit(1);
  if (!c) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, c.clientId))
    .limit(1);
  const [project] = c.projectId
    ? await db.select().from(projects).where(eq(projects.id, c.projectId)).limit(1)
    : [null];

  const status = projectStatusVariant(c.status, lang);
  const body = normalizeBody(c.bodyResolved || c.body || "");

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/app/contracts">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {t("Semua kontrak", "All contracts")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {c.title}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t("Untuk", "For")}:{" "}
            <Link
              href={`/app/clients/${c.clientId}`}
              className="text-slate-700 hover:underline font-medium"
            >
              {client?.name}
            </Link>
            {client?.email ? <> · {client.email}</> : null}
            {project ? (
              <>
                {" "}
                · {t("Proyek", "Project")}:{" "}
                <Link
                  href={`/app/projects/${c.projectId}`}
                  className="text-slate-700 hover:underline"
                >
                  {project.name}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/contracts/${c.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                {t("Unduh PDF", "Download PDF")}
              </a>
            </Button>
          ) : null}
          {canWrite &&
          (c.status === "draft" || c.status === "sent" || c.status === "viewed") ? (
            <SendContractButton
              contractId={c.id}
              status={c.status}
              labelSend={t("Kirim untuk tanda tangan", "Send for signature")}
              labelResend={t("Kirim ulang tautan", "Resend link")}
              labelSending={t("Mengirim...", "Sending...")}
              labelCopy={t("Salin", "Copy")}
              labelCopied={t("Disalin", "Copied")}
              successMessage={t(
                "Kontrak siap dibagikan. Salin tautan ke klien.",
                "Contract ready to share. Copy the link for your client.",
              )}
            />
          ) : null}
          {canWrite && (c.status === "sent" || c.status === "viewed") ? (
            <RevokeContractButton
              contractId={c.id}
              label={t("Cabut", "Revoke")}
              confirmText={t(
                "Cabut kontrak ini? Tautan klien langsung nonaktif.",
                "Revoke this contract? The client link stops working immediately.",
              )}
              pendingLabel={t("Mencabut...", "Revoking...")}
            />
          ) : null}
          {canWrite && c.status !== "signed" ? (
            <DeleteContractButton
              contractId={c.id}
              label={t("Hapus", "Delete")}
              confirmText={t(
                "Hapus kontrak ini? Tidak bisa dibatalkan.",
                "Delete this contract? This cannot be undone.",
              )}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("Status", "Status")}</p>
            <p className="text-lg font-semibold">{status.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              {t("Berlaku sampai", "Valid until")}
            </p>
            <p className="text-lg font-semibold">
              {c.validUntil ? new Date(c.validUntil).toLocaleDateString(locale) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("Dibuat", "Created")}</p>
            <p className="text-lg font-semibold">
              {new Date(c.createdAt).toLocaleDateString(locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {c.status === "signed" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              {t("Ditandatangani", "Signed")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">
                  {t("Penandatangan", "Signatory")}
                </div>
                <div className="font-medium">{c.signedName || "—"}</div>
                <div className="text-xs text-slate-500">{c.signedEmail}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {t("Ditandatangani pada", "Signed at")}
                </div>
                <div className="font-medium">
                  {c.signedAt ? new Date(c.signedAt).toLocaleString(locale) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {t("Alamat IP", "IP address")}
                </div>
                <div className="font-mono text-xs">{c.signedFromIp || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {t("Perangkat", "User agent")}
                </div>
                <div className="text-xs truncate">{c.signedUserAgent || "—"}</div>
              </div>
            </div>
            {c.signatureDataUrl ? (
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  {t("Tanda tangan", "Signature")}
                </div>
                <div className="border rounded-md p-2 bg-white max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.signatureDataUrl}
                    alt={t("Tanda tangan", "Signature")}
                    className="h-24 w-auto"
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {c.status === "declined" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <X className="h-5 w-5" />
              {t("Ditolak", "Declined")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <div className="text-xs text-slate-500">
                {t("Ditolak pada", "Declined at")}
              </div>
              <div>
                {c.declinedAt
                  ? new Date(c.declinedAt).toLocaleString(locale)
                  : "—"}
              </div>
            </div>
            {c.declineReason ? (
              <div>
                <div className="text-xs text-slate-500">{t("Alasan", "Reason")}</div>
                <div className="text-sm bg-slate-50 border rounded p-2 mt-1">
                  {c.declineReason}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {c.bodyResolved
              ? t("Isi terkirim (ter-render)", "Sent body (rendered)")
              : t("Isi draf", "Draft body")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {(c.sentAt || c.viewedAt || c.sharedTokenExpiresAt) &&
      c.status !== "signed" &&
      c.status !== "declined" ? (
        <p className="text-xs text-muted-foreground space-x-1">
          {c.sentAt ? (
            <span>
              {t("Terkirim", "Sent")} {new Date(c.sentAt).toLocaleString(locale)}
            </span>
          ) : null}
          {c.viewedAt ? (
            <span>
              · {t("Dilihat", "Viewed")}{" "}
              {new Date(c.viewedAt).toLocaleString(locale)}
            </span>
          ) : null}
          {c.sharedTokenExpiresAt ? (
            <span>
              · {t("Token kedaluwarsa", "Token expires")}{" "}
              {new Date(c.sharedTokenExpiresAt).toLocaleString(locale)}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
