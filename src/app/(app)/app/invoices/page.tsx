import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoices, workspaceMembers } from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { requireUser } from "@/lib/access";
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
import { Plus, FileText, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateID, formatMoney, cn } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { EmptyState } from "@/components/empty-state";
import { getCurrentLang, createT } from "@/lib/i18n";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  "all",
  "draft",
  "sent",
  "viewed",
  "overdue",
  "paid",
  "cancelled",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function formatInvoiceId(num: string): string {
  if (/^INV-\d{4}-\d{4}$/.test(num)) return num;

  const match = num.match(/^INV-(\d{1,4})$/);
  if (!match) return num;

  const year = new Date().getFullYear();
  return `INV-${year}-${match[1].padStart(4, "0")}`;
}

function parseStatusTab(raw?: string): StatusTab {
  if (raw && (STATUS_TABS as readonly string[]).includes(raw)) {
    return raw as StatusTab;
  }
  return "all";
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function tabLabel(tab: StatusTab, lang: "id" | "en"): string {
  if (tab === "all") return lang === "en" ? "All" : "Semua";
  return invoiceStatusVariant(tab, lang).label;
}

function buildInvoicesHref(status: StatusTab, page: number): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/app/invoices?${qs}` : "/app/invoices";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const params = await searchParams;
  const statusTab = parseStatusTab(params.status);
  const page = parsePage(params.page);

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  // Counts per status (for tab badges)
  const statusCountRows = await db
    .select({
      status: invoices.status,
      total: count(),
    })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId))
    .groupBy(invoices.status);

  const countsByStatus = Object.fromEntries(
    statusCountRows.map((row) => [row.status, Number(row.total) || 0]),
  ) as Record<string, number>;
  const totalAll = Object.values(countsByStatus).reduce((sum, n) => sum + n, 0);
  const tabCount = (tab: StatusTab) =>
    tab === "all" ? totalAll : countsByStatus[tab] ?? 0;

  const filteredTotal = tabCount(statusTab);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const whereClause =
    statusTab === "all"
      ? eq(invoices.workspaceId, workspaceId)
      : and(eq(invoices.workspaceId, workspaceId), eq(invoices.status, statusTab));

  const invoiceList = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientCompany: clients.companyName,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const fromItem = filteredTotal === 0 ? 0 : offset + 1;
  const toItem = Math.min(offset + invoiceList.length, filteredTotal);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("Invoice", "Invoices")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Buat dan kelola invoice untuk klienmu", "Create and manage invoices for your clients")}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href="/app/templates?tab=invoice" className="min-w-0 flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
              <FileText className="h-4 w-4" /> {t("Template", "Templates")}
            </Button>
          </Link>
          {canWrite && (
            <Link href="/app/invoices/new" className="min-w-0 flex-1 sm:flex-none">
              <Button size="sm" className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Invoice Baru", "New Invoice")}</span>
                <span className="sm:hidden">{t("Baru", "New")}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-1 rounded-lg border bg-muted/30 p-1 sm:min-w-0 sm:flex-wrap">
          {STATUS_TABS.map((tab) => {
            const active = tab === statusTab;
            const countVal = tabCount(tab);
            // Hide empty non-active tabs except core ones
            if (!active && countVal === 0 && tab !== "all" && tab !== "draft" && tab !== "paid" && tab !== "sent") {
              return null;
            }
            return (
              <Link
                key={tab}
                href={buildInvoicesHref(tab, 1)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                )}
              >
                <span>{tabLabel(tab, lang)}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {countVal}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {totalAll === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("Belum ada invoice", "No invoices yet")}
          description={t("Buat invoice pertama untuk mulai tagih klienmu.", "Create your first invoice to start billing clients.")}
          action={canWrite ? { label: t("Buat Invoice", "Create Invoice"), href: "/app/invoices/new" } : undefined}
        />
      ) : filteredTotal === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("Tidak ada invoice di tab ini", "No invoices in this tab")}
          description={t(
            "Coba tab status lain, atau buat invoice baru.",
            "Try another status tab, or create a new invoice.",
          )}
          action={canWrite ? { label: t("Buat Invoice", "Create Invoice"), href: "/app/invoices/new" } : undefined}
        />
      ) : (
        <>
          <div className="hidden md:block border rounded-lg overflow-x-auto min-w-0 max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("No.", "No.")}</TableHead>
                  <TableHead>{t("Klien", "Client")}</TableHead>
                  <TableHead>{t("Tanggal Terbit", "Issue Date")}</TableHead>
                  <TableHead>{t("Jatuh Tempo", "Due Date")}</TableHead>
                  <TableHead className="text-right">{t("Total", "Total")}</TableHead>
                  <TableHead>{t("Status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.map((inv) => {
                  const status = invoiceStatusVariant(inv.status, lang);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {formatInvoiceId(inv.invoiceNumber)}
                      </TableCell>
                      <TableCell>{inv.clientCompany || inv.clientName}</TableCell>
                      <TableCell>{formatDateID(inv.issueDate)}</TableCell>
                      <TableCell>{formatDateID(inv.dueDate)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/app/invoices/${inv.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {invoiceList.map((inv) => {
              const status = invoiceStatusVariant(inv.status, lang);
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {formatInvoiceId(inv.invoiceNumber)}
                      </Link>
                      <div className="text-sm text-muted-foreground truncate">
                        {inv.clientCompany || inv.clientName}
                      </div>
                    </div>
                    <Badge variant={status.variant} className="shrink-0">
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{t("Total", "Total")}</span>
                    <span className="tabular-nums font-medium">
                      {formatMoney(inv.total, inv.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {t("Jatuh Tempo", "Due Date")}
                    </span>
                    <span className="text-sm">{formatDateID(inv.dueDate)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t(
                `Menampilkan ${fromItem}–${toItem} dari ${filteredTotal}`,
                `Showing ${fromItem}–${toItem} of ${filteredTotal}`,
              )}
              {` · ${t(`${PAGE_SIZE}/halaman`, `${PAGE_SIZE}/page`)}`}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link href={buildInvoicesHref(statusTab, currentPage - 1)}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ChevronLeft className="h-4 w-4" />
                    {t("Sebelumnya", "Previous")}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  <ChevronLeft className="h-4 w-4" />
                  {t("Sebelumnya", "Previous")}
                </Button>
              )}
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground sm:text-sm">
                {currentPage}/{totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link href={buildInvoicesHref(statusTab, currentPage + 1)}>
                  <Button variant="outline" size="sm" className="gap-1">
                    {t("Berikutnya", "Next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  {t("Berikutnya", "Next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
