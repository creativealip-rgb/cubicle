import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  payments,
  clients,
  projects,
  packages,
} from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ArrowLeft, Eye, Share2 } from "lucide-react";
import { InvoiceItemManager } from "./add-item-button";

import { PaymentSection } from "./payment-section";
import { ShareTokenSection } from "./share-token-section";
import { SendInvoiceButton } from "./send-invoice-button";
import { SendReminderButton } from "./send-reminder-button";
import { DeleteInvoiceButton } from "./delete-invoice-button";
import { VoidInvoiceButton } from "./void-invoice-button";

import { InvoiceFullEditor } from "@/components/invoices/invoice-full-editor";
import { formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";
import { billingTypeLabel } from "@/lib/feature-access";
import { buildDefaultInvoiceMessage } from "@/lib/invoice-message";
import { decryptSecret } from "@/lib/google-calendar";
import { resolveFixedPriceInvoiceAmount } from "@/lib/invoice-project-items";

import {
  buildInvoiceBackUrl,
  parseInvoiceOrigin,
  type InvoiceOrigin,
} from "@/lib/invoice-origin";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { invoiceId } = await params;
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = lang === "en" ? "en-US" : "id-ID";
  const formatDate = (value: string | Date | null) => value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!inv) notFound();

  const requestedOrigin = parseInvoiceOrigin(await searchParams);
  let validatedOrigin: InvoiceOrigin | null =
    requestedOrigin?.type === "global" ? requestedOrigin : null;
  if (requestedOrigin?.type === "project") {
    const [originProject] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, requestedOrigin.resourceId),
          eq(projects.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (originProject) validatedOrigin = requestedOrigin;
  }
  if (requestedOrigin?.type === "client") {
    const [originClient] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, requestedOrigin.resourceId),
          eq(clients.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (originClient) validatedOrigin = requestedOrigin;
  }
  const backUrl = buildInvoiceBackUrl(validatedOrigin);

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  const allClients = await db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.workspaceId, workspaceId));
  const allProjects = await db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).where(and(eq(projects.workspaceId, workspaceId), ne(projects.status, "cancelled"), ne(projects.status, "archived")));
  const sameClientProjects = await db.select({ id: projects.id, name: projects.name, billingType: projects.billingType, billingModel: projects.billingModel, budget: projects.budget, currency: projects.currency })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.clientId, inv.clientId), ne(projects.status, "cancelled"), ne(projects.status, "archived")));
  const eligibleProjectItems = [] as Array<{ id: string; name: string; amount: number; currency: string }>;
  for (const project of sameClientProjects) {
    if ((project.billingModel ?? project.billingType) !== "fixed_price" && project.billingType !== "project") continue;
    const [prior] = await db.select({ amount: sql<string>`coalesce(sum(${invoiceItems.originalAmount}), '0')` }).from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(and(eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, project.id), eq(invoices.workspaceId, workspaceId), ne(invoices.status, "cancelled"), ne(invoices.status, "archived")));
    const amount = resolveFixedPriceInvoiceAmount(Number(project.budget ?? 0), Number(prior?.amount ?? 0));
    if (amount > 0 && !items.some((item) => item.sourceType === "project" && item.sourceId === project.id)) eligibleProjectItems.push({ id: project.id, name: project.name, amount, currency: project.currency });
  }

  // Project + package context (invoice created with a project)
  let invoiceProject: {
    name: string;
    billingType: string | null;
    billingTypeLabel: string;
    packageName?: string | null;
    packageHours?: number | null;
  } | null = null;
  if (inv.projectId) {
    const [proj] = await db
      .select({
        name: projects.name,
        billingType: projects.billingType,
        selectedPackageId: projects.selectedPackageId,
      })
      .from(projects)
      .where(eq(projects.id, inv.projectId))
      .limit(1);
    if (proj) {
      let packageName: string | null = null;
      let packageHours: number | null = null;
      if (proj.selectedPackageId) {
        const [pkg] = await db
          .select({ name: packages.name, hours: packages.hours })
          .from(packages)
          .where(eq(packages.id, proj.selectedPackageId))
          .limit(1);
        packageName = pkg?.name ?? null;
        packageHours = pkg?.hours ?? null;
      }
      invoiceProject = {
        name: proj.name,
        billingType: proj.billingType,
        billingTypeLabel: billingTypeLabel(proj.billingType, lang),
        packageName,
        packageHours,
      };
    }
  }

  const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);


  const hasShareToken = inv.sharedTokenHash && !inv.sharedTokenRevokedAt;
  const shareExpired = inv.sharedTokenExpiresAt
    ? new Date(inv.sharedTokenExpiresAt) < new Date()
    : false;
  let existingShareToken: string | null = null;
  if (hasShareToken && !shareExpired && inv.sharedTokenEnc) {
    try {
      existingShareToken = decryptSecret(inv.sharedTokenEnc);
    } catch {
      existingShareToken = null;
    }
  }

  const isPaid = Number(inv.total) > 0 && totalPaid >= Number(inv.total);
  // DB status is the source of truth for the badge. A manually marked "paid"
  // invoice (without a recorded payment row) must still show "Lunas".
  // Only override upward to "paid" when payments cover the total but the DB
  // status hasn't been updated yet — never downgrade a "paid" status to
  // "payment due" based on payment rows, and never override terminal
  // cancelled/archived statuses (a fully paid invoice that was voided must
  // still show "Dibatalkan").
  const displayStatus =
    ["cancelled", "archived"].includes(inv.status)
      ? inv.status
      : inv.status === "paid"
        ? "paid"
        : isPaid
          ? "paid"
          : inv.status;
  const voidable =
    !["cancelled", "archived"].includes(inv.status) &&
    (inv.status === "paid" || totalPaid > 0);
  const defaultInvoiceMessage = buildDefaultInvoiceMessage({
    clientName: client?.companyName || client?.name || t("Klien", "Client"),
    invoiceNumber: inv.invoiceNumber,
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    dueDate: inv.dueDate ? formatDate(inv.dueDate) : null,
  });

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backUrl}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="app-page-title">
              Invoice {inv.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client ? client.companyName || client.name : t("Klien tidak diketahui", "Unknown Client")}
            </p>
            {invoiceProject ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoiceProject.name}
                {" · "}
                {invoiceProject.billingTypeLabel}
                {invoiceProject.billingType === "package" && invoiceProject.packageName
                  ? ` · ${invoiceProject.packageName}${
                      invoiceProject.packageHours != null
                        ? ` (${invoiceProject.packageHours}${t(" jam", "h")})`
                        : ""
                    }`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              {t("Pratinjau Invoice", "Invoice Preview")}
            </Link>
          </Button>
          <SendInvoiceButton
            invoiceId={invoiceId}
            defaultMessage={defaultInvoiceMessage}
            clientEmail={client?.email}
            defaultFrom={`${String(inv.issueDate).slice(0, 7)}-01`}
            defaultTo={String(inv.issueDate).slice(0, 10)}
            disabled={!client?.email || items.length === 0}
          />
          <SendReminderButton
            invoiceId={invoiceId}
            disabled={!client?.email || items.length === 0 || ["draft", "paid", "cancelled"].includes(inv.status)}
          />
          <VoidInvoiceButton
            invoiceId={invoiceId}
            disabled={!voidable}
          />
          <DeleteInvoiceButton
            invoiceId={invoiceId}
            disabled={!["draft", "cancelled"].includes(inv.status)}
            backUrl={backUrl}
          />
          <Badge
            variant={invoiceStatusVariant(displayStatus, lang).variant}
            className="text-sm px-3 py-1"
          >
            {invoiceStatusVariant(displayStatus, lang).label}
          </Badge>

        </div>
      </div>

      <InvoiceFullEditor
        invoice={{
          id: inv.id,
          clientId: inv.clientId,
          projectId: inv.projectId,
          invoiceNumber: inv.invoiceNumber,
          issueDate: String(inv.issueDate),
          dueDate: inv.dueDate ? String(inv.dueDate) : null,
          currency: inv.currency,
          discount: Number(inv.discount),
          tax: Number(inv.tax),
          chargeType: inv.chargeType,
          notes: inv.notes ?? "",
          terms: inv.terms ?? "",
          status: inv.status,
        }}
        initialItems={items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sourceType: item.sourceType,
        }))}
        clients={allClients}
        projects={allProjects}
        sourceActions={<InvoiceItemManager invoiceId={invoiceId} projectOptions={eligibleProjectItems} />}
      >
        <Card>
          <CardHeader><CardTitle>{t("Pembayaran", "Payments")}</CardTitle></CardHeader>
          <CardContent>
            <PaymentSection invoiceId={invoiceId} payments={pays.map((p) => ({ ...p, paidAt: p.paidAt ? String(p.paidAt) : null, createdAt: String(p.createdAt) }))} total={Number(inv.total)} currency={inv.currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> {t("Link Berbagi Invoice", "Invoice Share Link")}</CardTitle></CardHeader>
          <CardContent><ShareTokenSection invoiceId={invoiceId} hasToken={!!hasShareToken} isExpired={shareExpired} initialToken={existingShareToken} /></CardContent>
        </Card>
      </InvoiceFullEditor>
    </div>
  );
}
