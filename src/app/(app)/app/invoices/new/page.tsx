import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoiceTemplates, projects, timeEntries, packages, workspaceCurrencyRates, workspaces } from "@/db/schema";
import { eq, asc, and, ne } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "@/components/forms/invoice-form";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function NewInvoicePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const clientOptions = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(asc(clients.companyName), asc(clients.name));

  const templateOptions = await db
    .select({
      id: invoiceTemplates.id,
      name: invoiceTemplates.name,
      defaultCurrency: invoiceTemplates.defaultCurrency,
      defaultTaxRate: invoiceTemplates.defaultTaxRate,
      notes: invoiceTemplates.notes,
      terms: invoiceTemplates.terms,
    })
    .from(invoiceTemplates)
    .where(eq(invoiceTemplates.workspaceId, workspaceId))
    .orderBy(asc(invoiceTemplates.name));

  const projectOptions = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
      billingType: projects.billingType,
      currency: projects.currency,
      budget: projects.budget,
      rate: projects.rate,
      packagePrice: packages.price,
      packageCustomPrice: packages.customPrice,
    })
    .from(projects)
    .leftJoin(packages, eq(projects.selectedPackageId, packages.id))
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(asc(projects.name));

  const [workspace] = await db.select({ defaultCurrency: workspaces.defaultCurrency }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currencyRates = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));

  const timeEntryOptions = await db.select({
    id: timeEntries.id, clientId: timeEntries.clientId, projectId: timeEntries.projectId,
    description: timeEntries.description, durationMinutes: timeEntries.durationMinutes, hourlyRate: timeEntries.hourlyRate,
  }).from(timeEntries).where(and(
    eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.billable, true), ne(timeEntries.status, "invoiced"),
  )).orderBy(asc(timeEntries.createdAt));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/invoices">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="app-page-title">Invoice Baru</h1>
          <p className="text-sm text-muted-foreground">
            Lengkapi detail dan item tagihan dalam satu langkah.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {clientOptions.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tambahkan klien sebelum membuat invoice.
              </p>
              <Link href="/app/clients/new">
                <Button>Tambah Klien</Button>
              </Link>
            </div>
          ) : (
            <InvoiceForm mode="create" clients={clientOptions} projects={projectOptions} templates={templateOptions} timeEntries={timeEntryOptions} baseCurrency={workspace?.defaultCurrency || "IDR"} currencyRates={currencyRates} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
