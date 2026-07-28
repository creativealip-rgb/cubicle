import Link from "next/link";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function NewProposalPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/proposals");
  const ws = await getWorkspaceFullForCurrentUser();

  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")))
    .orderBy(clients.name);

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/app/proposals">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            {t("Semua proposal", "All proposals")}
          </Link>
        </Button>
        <h1 className="app-page-title">
          {t("Proposal baru", "New proposal")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t(
            "Kirim scope + harga ke calon klien.",
            "Send scope + pricing to a prospect.",
          )}
        </p>
      </div>
      {clientRows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t(
            "Belum ada klien aktif. Buat klien dulu sebelum membuat proposal.",
            "No active clients yet. Create a client before making a proposal.",
          )}
          <div className="mt-4">
            <Button asChild>
              <Link href="/app/clients">{t("Ke klien", "Go to clients")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ProposalForm
          workspaceId={ws.id}
          defaultCurrency={ws.defaultCurrency}
          defaultTaxRate={ws.defaultTaxRate ?? "0"}
          clients={clientRows}
        />
      )}
    </div>
  );
}
