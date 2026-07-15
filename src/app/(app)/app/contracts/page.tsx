import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contracts, clients } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
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
import { FileSignature } from "lucide-react";
import { CreateContractButton } from "@/components/contracts/create-contract-button";
import { SendContractButton } from "@/components/contracts/send-contract-button";
import { projectStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";

const STATUS_TABS = [
  "all",
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "revoked",
] as const;

function activityLabel(
  c: {
    status: string;
    sentAt: Date | null;
    viewedAt: Date | null;
    signedAt: Date | null;
    declinedAt: Date | null;
    createdAt: Date;
    updatedAt?: Date | null;
    validUntil: string | null;
  },
  t: (id: string, en: string) => string,
  lang: string,
) {
  const locale = lang === "en" ? "en-US" : "id-ID";
  const fmt = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(locale) : "";

  if (c.status === "signed") {
    return `${t("Ditandatangani", "Signed")} ${fmt(c.signedAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "declined") {
    return `${t("Ditolak", "Declined")} ${fmt(c.declinedAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "viewed") {
    return `${t("Dilihat", "Viewed")} ${fmt(c.viewedAt || c.sentAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "sent") {
    return `${t("Terkirim", "Sent")} ${fmt(c.sentAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "revoked") {
    return `${t("Dicabut", "Revoked")} ${fmt(c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "expired") {
    return `${t("Kedaluwarsa", "Expired")} ${fmt(c.validUntil || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "draft") {
    return `${t("Draf", "Draft")} ${fmt(c.createdAt)}`;
  }
  return fmt(c.updatedAt || c.createdAt);
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const statusFilter = STATUS_TABS.includes(params.status as (typeof STATUS_TABS)[number])
    ? (params.status as (typeof STATUS_TABS)[number])
    : "all";

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const conditions = [eq(contracts.workspaceId, workspaceId)];
  if (statusFilter !== "all") {
    conditions.push(eq(contracts.status, statusFilter));
  }

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
      updatedAt: contracts.updatedAt,
      clientId: contracts.clientId,
      clientName: clients.name,
    })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(...conditions))
    .orderBy(desc(contracts.createdAt))
    .limit(100);

  const clientsList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")))
    .orderBy(clients.name);

  const countRows = await db
    .select({
      status: contracts.status,
      count: sql<number>`count(*)::int`,
    })
    .from(contracts)
    .where(eq(contracts.workspaceId, workspaceId))
    .groupBy(contracts.status);

  const counts: Record<string, number> = { all: 0 };
  for (const row of countRows) {
    const n = Number(row.count) || 0;
    counts[row.status] = n;
    counts.all += n;
  }

  const tabLabel: Record<string, string> = {
    all: t("Semua", "All"),
    draft: t("Draf", "Draft"),
    sent: t("Terkirim", "Sent"),
    viewed: t("Dilihat", "Viewed"),
    signed: t("Ditandatangani", "Signed"),
    declined: t("Ditolak", "Declined"),
    expired: t("Kedaluwarsa", "Expired"),
    revoked: t("Dicabut", "Revoked"),
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Kontrak", "Contracts")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Kirim kontrak ke klien. Mereka tanda tangan di browser. Kamu dapat jejak audit.",
              "Send contracts to clients. They sign in browser. You get an audit trail.",
            )}
          </p>
        </div>
        {canWrite && (
          <CreateContractButton clients={clientsList} workspaceId={workspaceId} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => {
          const active = statusFilter === s;
          const count = counts[s] ?? 0;
          return (
            <Button key={s} asChild size="sm" variant={active ? "default" : "outline"}>
              <Link href={s === "all" ? "/app/contracts" : `/app/contracts?status=${s}`}>
                {tabLabel[s]}
                <span className="ml-1.5 text-[11px] opacity-80">{count}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileSignature className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">
            {statusFilter === "all"
              ? t(
                  "Belum ada kontrak. Buat kontrak pertama untuk mulai tanda tangan elektronik.",
                  "No contracts yet. Create your first one to start electronic signing.",
                )
              : t(
                  "Tidak ada kontrak dengan status ini.",
                  "No contracts with this status.",
                )}
          </p>
          {canWrite && statusFilter === "all" && (
            <CreateContractButton clients={clientsList} workspaceId={workspaceId} />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Judul", "Title")}</TableHead>
                <TableHead>{t("Klien", "Client")}</TableHead>
                <TableHead>{t("Status", "Status")}</TableHead>
                <TableHead>{t("Aktivitas", "Activity")}</TableHead>
                <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const status = projectStatusVariant(c.status, lang);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/app/contracts/${c.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {c.title}
                      </Link>
                      {c.validUntil ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t("Berlaku s/d", "Valid until")}{" "}
                          {new Date(c.validUntil).toLocaleDateString(
                            lang === "en" ? "en-US" : "id-ID",
                          )}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/app/clients/${c.clientId}`}
                        className="text-slate-600 hover:underline"
                      >
                        {c.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {activityLabel(c, t, lang)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite &&
                      (c.status === "draft" ||
                        c.status === "sent" ||
                        c.status === "viewed") ? (
                        <SendContractButton
                          contractId={c.id}
                          status={c.status}
                          compact
                          labelSend={t("Kirim", "Send")}
                          labelResend={t("Kirim ulang", "Resend")}
                          labelSending={t("Mengirim...", "Sending...")}
                          labelCopy={t("Salin", "Copy")}
                          labelCopied={t("Disalin", "Copied")}
                          successMessage={t(
                            "Kontrak siap dibagikan. Salin tautan ke klien.",
                            "Contract ready to share. Copy the link for your client.",
                          )}
                        />
                      ) : (
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link href={`/app/contracts/${c.id}`}>
                            {t("Buka", "Open")}
                          </Link>
                        </Button>
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
