import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoices, projects, workspaceMembers } from "@/db/schema";
import { eq, desc, and, count, ne, isNull, SQL } from "drizzle-orm";
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
import { billingTypeLabel } from "@/lib/feature-access";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  "all",
  "draft",
  "sent",
  "viewed",
  "overdue",
  "paid",
  "cancelled",
  "archived",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const BILLING_FILTERS = ["all", "hours", "package", "project", "none"] as const;
type BillingFilter = (typeof BILLING_FILTERS)[number];

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

function parseBillingFilter(raw?: string): BillingFilter {
  if (raw && (BILLING_FILTERS as readonly string[]).includes(raw)) {
    return raw as BillingFilter;
  }
  return "all";
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function isUuid(value?: string): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function tabLabel(tab: StatusTab, lang: "id" | "en"): string {
  if (tab === "all") return lang === "en" ? "All" : "Semua";
  return invoiceStatusVariant(tab, lang).label;
}

function billingFilterLabel(filter: BillingFilter, lang: "id" | "en"): string {
  if (filter === "all") return lang === "en" ? "All billing types" : "Semua jenis";
  if (filter === "none") return lang === "en" ? "No project" : "Tanpa proyek";
  return billingTypeLabel(filter, lang);
}

type InvoiceListFilters = {
  status: StatusTab;
  clientId?: string;
  billing: BillingFilter;
  page: number;
};

function buildInvoicesHref(filters: InvoiceListFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.billing !== "all") params.set("billing", filters.billing);
  if (filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `/app/invoices?${qs}` : "/app/invoices";
}

function buildFilterConditions(opts: {
  workspaceId: string;
  statusTab: StatusTab;
  clientId?: string;
  billing: BillingFilter;
}): SQL[] {
  const conditions: SQL[] = [eq(invoices.workspaceId, opts.workspaceId)];

  if (opts.statusTab === "all") {
    conditions.push(ne(invoices.status, "archived"));
  } else {
    conditions.push(eq(invoices.status, opts.statusTab));
  }

  if (opts.clientId) {
    conditions.push(eq(invoices.clientId, opts.clientId));
  }

  if (opts.billing === "none") {
    conditions.push(isNull(invoices.projectId));
  } else if (opts.billing !== "all") {
    conditions.push(eq(projects.billingType, opts.billing));
  }

  return conditions;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    clientId?: string;
    billing?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const params = await searchParams;
  const statusTab = parseStatusTab(params.status);
  const page = parsePage(params.page);
  const billing = parseBillingFilter(params.billing);
  const clientId = isUuid(params.clientId) ? params.clientId : undefined;

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  // Client options for filter dropdown
  const clientOptions = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  // Counts per status (respect client/billing filters; include archived for badge)
  const statusCountWhere: SQL[] = [eq(invoices.workspaceId, workspaceId)];
  if (clientId) statusCountWhere.push(eq(invoices.clientId, clientId));
  if (billing === "none") statusCountWhere.push(isNull(invoices.projectId));
  else if (billing !== "all") statusCountWhere.push(eq(projects.billingType, billing));

  const needsProjectJoin = billing !== "all" && billing !== "none";

  const statusCountRows = needsProjectJoin
    ? await db
        .select({
          status: invoices.status,
          total: count(),
        })
        .from(invoices)
        .leftJoin(projects, eq(projects.id, invoices.projectId))
        .where(and(...statusCountWhere))
        .groupBy(invoices.status)
    : await db
        .select({
          status: invoices.status,
          total: count(),
        })
        .from(invoices)
        .where(and(...statusCountWhere))
        .groupBy(invoices.status);

  const countsByStatus = Object.fromEntries(
    statusCountRows.map((row) => [row.status, Number(row.total) || 0]),
  ) as Record<string, number>;
  const archivedCount = countsByStatus.archived ?? 0;
  const totalActive = Object.entries(countsByStatus).reduce(
    (sum, [status, n]) => (status === "archived" ? sum : sum + n),
    0,
  );
  const totalAllIncludingArchived = totalActive + archivedCount;
  const tabCount = (tab: StatusTab) =>
    tab === "all" ? totalActive : countsByStatus[tab] ?? 0;

  const filteredTotal = tabCount(statusTab);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const listConditions = buildFilterConditions({
    workspaceId,
    statusTab,
    clientId,
    billing,
  });

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
      projectId: invoices.projectId,
      projectName: projects.name,
      billingType: projects.billingType,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(...listConditions))
    .orderBy(desc(invoices.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const fromItem = filteredTotal === 0 ? 0 : offset + 1;
  const toItem = Math.min(offset + invoiceList.length, filteredTotal);

  const filtersForHref = {
    status: statusTab,
    clientId,
    billing,
    page: currentPage,
  };

  const hasExtraFilters = Boolean(clientId) || billing !== "all";
  const selectedClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : undefined;

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

      {/* Status tabs + filters (same row pattern as Clients page) */}
      <Tabs defaultValue={statusTab} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 lg:w-auto">
            {STATUS_TABS.map((tab) => {
              const active = tab === statusTab;
              const countVal = tabCount(tab);
              if (
                !active &&
                countVal === 0 &&
                tab !== "all" &&
                tab !== "draft" &&
                tab !== "paid" &&
                tab !== "sent" &&
                tab !== "archived"
              ) {
                return null;
              }
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  asChild
                  className="gap-1.5 data-[state=active]:shadow"
                >
                  <Link href={buildInvoicesHref({ ...filtersForHref, status: tab, page: 1 })}>
                    <span>{tabLabel(tab, lang)}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        active
                          ? "bg-primary/10 text-primary"
                          : "bg-background/80 text-muted-foreground",
                      )}
                    >
                      {countVal}
                    </span>
                  </Link>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <form
            method="get"
            action="/app/invoices"
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto"
          >
            {statusTab !== "all" && <input type="hidden" name="status" value={statusTab} />}
            <select
              id="invoice-filter-client"
              name="clientId"
              defaultValue={clientId ?? ""}
              aria-label={t("Klien", "Client")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-44"
            >
              <option value="">{t("Semua klien", "All clients")}</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
            <select
              id="invoice-filter-billing"
              name="billing"
              defaultValue={billing === "all" ? "" : billing}
              aria-label={t("Jenis proyek", "Project type")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-44"
            >
              <option value="">{billingFilterLabel("all", lang)}</option>
              <option value="hours">{billingFilterLabel("hours", lang)}</option>
              <option value="package">{billingFilterLabel("package", lang)}</option>
              <option value="project">{billingFilterLabel("project", lang)}</option>
              <option value="none">{billingFilterLabel("none", lang)}</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="outline" className="flex-1 sm:flex-none">
                {t("Filter", "Filter")}
              </Button>
              {hasExtraFilters && (
                <Link href={buildInvoicesHref({ status: statusTab, page: 1, billing: "all" })}>
                  <Button type="button" variant="ghost" size="sm">
                    {t("Reset", "Reset")}
                  </Button>
                </Link>
              )}
            </div>
          </form>
        </div>
      </Tabs>

      {hasExtraFilters && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("Filter aktif:", "Active filters:")}{" "}
          {selectedClient
            ? selectedClient.companyName || selectedClient.name
            : t("Semua klien", "All clients")}
          {" · "}
          {billingFilterLabel(billing, lang)}
        </p>
      )}

      {totalAllIncludingArchived === 0 && !hasExtraFilters ? (
        <EmptyState
          icon={FileText}
          title={t("Belum ada invoice", "No invoices yet")}
          description={t("Buat invoice pertama untuk mulai tagih klienmu.", "Create your first invoice to start billing clients.")}
          action={canWrite ? { label: t("Buat Invoice", "Create Invoice"), href: "/app/invoices/new" } : undefined}
        />
      ) : filteredTotal === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            statusTab === "archived"
              ? t("Belum ada invoice di arsip", "No archived invoices")
              : hasExtraFilters
                ? t("Tidak ada invoice cocok filter", "No invoices match filters")
                : t("Tidak ada invoice di tab ini", "No invoices in this tab")
          }
          description={
            statusTab === "archived"
              ? t(
                  "Ubah status invoice ke \"archived\" lewat Edit Invoice untuk arsipkan.",
                  'Set invoice status to "archived" in Edit Invoice to archive it.',
                )
              : hasExtraFilters
                ? t(
                    "Coba ganti klien / jenis proyek, atau reset filter.",
                    "Try another client / project type, or reset filters.",
                  )
                : t(
                    "Coba tab status lain, atau buat invoice baru.",
                    "Try another status tab, or create a new invoice.",
                  )
          }
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
                  <TableHead>{t("Proyek", "Project")}</TableHead>
                  <TableHead>{t("Jenis", "Type")}</TableHead>
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
                      <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                        {inv.projectName || "—"}
                      </TableCell>
                      <TableCell>
                        {inv.billingType ? (
                          <Badge variant="outline" className="font-normal">
                            {billingTypeLabel(inv.billingType, lang)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
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
                      {(inv.projectName || inv.billingType) && (
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {inv.projectName || "—"}
                          {inv.billingType ? ` · ${billingTypeLabel(inv.billingType, lang)}` : ""}
                        </div>
                      )}
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
                <Link href={buildInvoicesHref({ ...filtersForHref, page: currentPage - 1 })}>
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
                <Link href={buildInvoicesHref({ ...filtersForHref, page: currentPage + 1 })}>
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
