import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contractTemplates, contracts } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
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
import { Plus, FileText, Star, Layers } from "lucide-react";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function ContractTemplatesPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = lang === "en" ? "en-US" : "id-ID";

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, ws.id);
  const canWrite = member.role === "owner" || member.role === "member";

  const rows = await db
    .select({
      id: contractTemplates.id,
      name: contractTemplates.name,
      body: contractTemplates.body,
      isDefault: contractTemplates.isDefault,
      createdAt: contractTemplates.createdAt,
      updatedAt: contractTemplates.updatedAt,
    })
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, ws.id))
    .orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.updatedAt));

  const usageRows = await db
    .select({
      templateId: contracts.templateId,
      c: count(),
    })
    .from(contracts)
    .where(eq(contracts.workspaceId, ws.id))
    .groupBy(contracts.templateId);

  const usageCounts: Record<string, number> = {};
  for (const row of usageRows) {
    if (row.templateId) usageCounts[row.templateId] = Number(row.c) || 0;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Template Kontrak", "Contract Templates")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Isi kontrak siap pakai dengan placeholder",
              "Reusable contract bodies with placeholders",
            )}{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              {"{{client.name}}"}
            </code>
            .{" "}
            {t(
              "Otomatis terisi saat dikirim.",
              "Auto-filled when sent.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/templates?tab=contract">
              <Layers className="h-4 w-4 mr-1" />
              {t("Pusat Template", "Template Center")}
            </Link>
          </Button>
          {canWrite ? (
            <Button asChild>
              <Link href="/app/contract-templates/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("Template baru", "New template")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">
            {t(
              "Belum ada template. Buat satu agar isi kontrak bisa dipakai ulang untuk klien.",
              "No templates yet. Create one so contract bodies can be reused for clients.",
            )}
          </p>
          {canWrite ? (
            <Button asChild>
              <Link href="/app/contract-templates/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("Buat template pertama", "Create first template")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Nama", "Name")}</TableHead>
                <TableHead>{t("Status", "Status")}</TableHead>
                <TableHead>{t("Dipakai", "Used by")}</TableHead>
                <TableHead>{t("Diperbarui", "Updated")}</TableHead>
                <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tpl) => (
                <TableRow key={tpl.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Link
                      href={`/app/contract-templates/${tpl.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {tpl.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {(tpl.body || "").replace(/\\n/g, " ").slice(0, 90)}
                      {(tpl.body || "").length > 90 ? "…" : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    {tpl.isDefault ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {usageCounts[tpl.id] || 0}{" "}
                    {t("kontrak", "contracts")}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {tpl.updatedAt
                      ? new Date(
                          tpl.updatedAt as unknown as string | number | Date,
                        ).toLocaleDateString(locale)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link href={`/app/contract-templates/${tpl.id}`}>
                        {t("Buka", "Open")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
