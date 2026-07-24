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
import { DeleteProposalButton } from "@/components/proposals/delete-proposal-button";
import { ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { projectStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";

function normalizeBody(body: string) {
  // seed/legacy may store literal \n sequences
  return body.replace(/\\n/g, "\n");
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = lang === "en" ? "en-US" : "id-ID";

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, await getWorkspaceForCurrentUser()))
    .limit(1);
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
      viewedAt: proposals.viewedAt,
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

  const items = (
    (p.lineItems as Array<{
      description: string;
      quantity?: number;
      qty?: number;
      unitPrice?: number;
      unit_price?: number;
      amount: number;
    }> | null) ?? []
  ).map((li) => ({
    description: li.description,
    quantity: li.quantity ?? li.qty ?? 1,
    unitPrice: li.unitPrice ?? li.unit_price ?? 0,
    amount:
      li.amount ??
      (li.quantity ?? li.qty ?? 1) * (li.unitPrice ?? li.unit_price ?? 0),
  }));
  const subtotal = Number(p.subtotal ?? items.reduce((s, li) => s + Number(li.amount), 0));
  const tax = Number(p.tax ?? 0);
  const total = Number(p.total ?? subtotal + tax);
  const dpPercent = Number(p.downPaymentPercent ?? 0);
  const dpAmount = total * (dpPercent / 100);
  const status = projectStatusVariant(p.status, lang);

  let projectName: string | null = null;
  if (p.projectId) {
    const [proj] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, p.projectId))
      .limit(1);
    projectName = proj?.name ?? null;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/app/proposals">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {t("Semua proposal", "All proposals")}
            </Link>
          </Button>
          <h1 className="app-page-title">
            {p.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("Untuk", "For")}{" "}
            <Link
              href={`/app/clients/${p.clientId}`}
              className="text-slate-700 hover:underline"
            >
              {p.clientName}
            </Link>
            {p.clientEmail ? <> · {p.clientEmail}</> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {canWrite &&
          (p.status === "draft" || p.status === "sent" || p.status === "viewed") ? (
            <SendProposalButton
              proposalId={p.id}
              status={p.status}
              labelSend={t("Kirim ke klien", "Send to client")}
              labelResend={t("Kirim ulang tautan", "Resend link")}
              labelSending={t("Mengirim...", "Sending...")}
              labelCopy={t("Salin", "Copy")}
              labelCopied={t("Disalin", "Copied")}
              successMessage={t(
                "Proposal siap dibagikan. Salin tautan ke klien.",
                "Proposal ready to share. Copy the link for your client.",
              )}
            />
          ) : null}
          {canWrite && p.status !== "accepted" ? (
            <DeleteProposalButton
              proposalId={p.id}
              label={t("Hapus", "Delete")}
              confirmText={t(
                "Hapus proposal ini? Tidak bisa dibatalkan.",
                "Delete this proposal? This cannot be undone.",
              )}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("Total", "Total")}</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMoney(total, p.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              {t("DP", "Down payment")} ({dpPercent}%)
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMoney(dpAmount, p.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              {t("Berlaku sampai", "Valid until")}
            </p>
            <p className="text-lg font-semibold">
              {p.validUntil
                ? new Date(p.validUntil).toLocaleDateString(locale)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Rincian item", "Line items")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Deskripsi", "Description")}</TableHead>
                <TableHead className="text-right w-20">{t("Qty", "Qty")}</TableHead>
                <TableHead className="text-right w-32">
                  {t("Satuan", "Unit")}
                </TableHead>
                <TableHead className="text-right w-32">
                  {t("Jumlah", "Amount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((li, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{li.description}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {li.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                    {formatMoney(li.unitPrice, p.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium whitespace-nowrap">
                    {formatMoney(li.amount, p.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t pt-3 mt-3 text-sm space-y-1">
            <div className="flex justify-end gap-8">
              <span className="text-slate-500">{t("Subtotal", "Subtotal")}</span>
              <span className="tabular-nums w-36 text-right whitespace-nowrap">
                {formatMoney(subtotal, p.currency)}
              </span>
            </div>
            {tax > 0 && (
              <div className="flex justify-end gap-8">
                <span className="text-slate-500">{t("Pajak", "Tax")}</span>
                <span className="tabular-nums w-36 text-right whitespace-nowrap">
                  {formatMoney(tax, p.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-8 pt-2 border-t font-semibold">
              <span>{t("Total", "Total")}</span>
              <span className="tabular-nums w-36 text-right whitespace-nowrap">
                {formatMoney(total, p.currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {p.body ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Cakupan", "Scope")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              <ReactMarkdown>{normalizeBody(p.body)}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {p.status === "accepted" && p.projectId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Hasil", "Outcome")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              ✅ {t("Proyek dibuat", "Project created")}:{" "}
              <Link
                href={`/app/projects/${p.projectId}`}
                className="text-blue-600 hover:underline"
              >
                {projectName ?? t("Lihat proyek", "View project")}
              </Link>
            </p>
            <p>
              ✅ {t("Invoice DP dibuat untuk", "DP invoice created for")}{" "}
              {p.clientName}.
            </p>
            {p.acceptedAt ? (
              <p className="text-xs text-slate-500">
                {t("Diterima", "Accepted")}{" "}
                {new Date(p.acceptedAt).toLocaleString(locale)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {p.status === "declined" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Ditolak", "Declined")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {p.declineReason ? (
              <p>
                {t("Alasan", "Reason")}: {p.declineReason}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {t("Tanpa alasan", "No reason provided")}
              </p>
            )}
            {p.declinedAt ? (
              <p className="text-xs text-slate-500 mt-2">
                {t("Ditolak", "Declined")}{" "}
                {new Date(p.declinedAt).toLocaleString(locale)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(p.sentAt || p.viewedAt) && p.status !== "accepted" && p.status !== "declined" ? (
        <p className="text-xs text-muted-foreground">
          {p.sentAt
            ? `${t("Terkirim", "Sent")} ${new Date(p.sentAt).toLocaleString(locale)}`
            : null}
          {p.viewedAt
            ? ` · ${t("Dilihat", "Viewed")} ${new Date(p.viewedAt).toLocaleString(locale)}`
            : null}
        </p>
      ) : null}
    </div>
  );
}
