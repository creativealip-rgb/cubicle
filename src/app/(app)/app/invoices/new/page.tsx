import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, invoiceTemplates, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
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
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(asc(projects.name));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/invoices">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Baru</h1>
          <p className="text-sm text-muted-foreground">
            Buat draft invoice, lalu tambah item setelah disimpan.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent>
          {clientOptions.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Add client before creating invoice.
              </p>
              <Link href="/app/clients/new">
                <Button>Add Client</Button>
              </Link>
            </div>
          ) : (
            <InvoiceForm mode="create" clients={clientOptions} projects={projectOptions} templates={templateOptions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
