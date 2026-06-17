import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { ProposalForm } from "@/components/proposals/proposal-form";

async function getWorkspace() {
  const [ws] = await db
    .select({ id: workspaces.id, defaultCurrency: workspaces.defaultCurrency, defaultTaxRate: workspaces.defaultTaxRate })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws;
}

export default async function NewProposalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  await assertWorkspaceWritable(db, user.id, ws.id);

  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.workspaceId, ws.id), eq(clients.status, "active")))
    .orderBy(clients.name);

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New proposal</h1>
        <p className="text-sm text-slate-500 mt-1">Send scope + price to a prospective client.</p>
      </div>
      <ProposalForm
        workspaceId={ws.id}
        defaultCurrency={ws.defaultCurrency}
        defaultTaxRate={ws.defaultTaxRate ?? "0"}
        clients={clientRows}
      />
    </div>
  );
}
